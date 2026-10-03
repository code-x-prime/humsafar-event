import crypto from 'crypto';
import Razorpay from 'razorpay';
import * as settings from '../config/settings.service.js';
import { ERROR_CODES } from '../config/constants.js';
import { logger } from '../config/logger.js';

function notConfiguredError() {
  const err = new Error('Razorpay is not configured. Add credentials in Settings → Payment.');
  err.status = 503;
  err.code = ERROR_CODES.NOT_CONFIGURED;
  return err;
}

function getConfig() {
  const cfg = settings.getGroup('PAYMENT');
  if (!cfg.keyId || !cfg.keySecret) return null;
  return cfg;
}

let client = null;
let cachedKeyId = null;

function getClient() {
  const cfg = getConfig();
  if (!cfg) throw notConfiguredError();

  if (!client || cachedKeyId !== cfg.keyId) {
    client = new Razorpay({ key_id: cfg.keyId, key_secret: cfg.keySecret });
    cachedKeyId = cfg.keyId;
  }

  return client;
}

export function isConfigured() {
  return getConfig() !== null;
}

// True once a webhook secret is saved in Settings → Payment. Without it every
// webhook delivery is rejected, so a customer who pays and then closes the tab
// before the browser reports back would never get their order confirmed.
export function hasWebhookSecret() {
  return Boolean(getConfig()?.webhookSecret);
}

export async function testConnection() {
  getClient();
  return { ok: true };
}

// Constant-time comparison of two hex signatures, so how long the check takes
// can't be used to guess a valid signature one character at a time.
function signaturesMatch(expected, received) {
  if (typeof received !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// amountRupees is the human amount (e.g. 4699.5) — Razorpay wants paise.
export async function createRazorpayOrder({ amountRupees, receipt, notes }) {
  const rzp = getClient();

  try {
    return await rzp.orders.create({
      amount: Math.round(amountRupees * 100),
      currency: 'INR',
      receipt,
      notes,
    });
  } catch (cause) {
    // The Razorpay SDK rejects with a plain object, not an Error, which the API
    // would otherwise report as a vague 500. Keep the real reason in the log and
    // give the customer something they can act on.
    logger.error({ cause }, 'Razorpay order creation failed');
    const err = new Error('The payment gateway is not responding right now. Please try again in a moment.');
    err.status = 502;
    err.code = ERROR_CODES.INTERNAL_ERROR;
    throw err;
  }
}

// Verifies the signature Razorpay's checkout.js hands back after a successful
// payment (order_id + payment_id + signature) — this is what proves the
// payment is genuine before we ever mark an order as paid.
export function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const cfg = getConfig();
  if (!cfg) throw notConfiguredError();

  const expected = crypto
    .createHmac('sha256', cfg.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return signaturesMatch(expected, razorpaySignature);
}

// Verifies the signature Razorpay sends in the X-Razorpay-Signature header on
// webhook deliveries — a separate secret from the API key, configured in
// Settings → Payment → Webhook Secret and mirrored in the Razorpay dashboard.
export function verifyWebhookSignature(rawBody, signature) {
  const cfg = getConfig();
  if (!cfg?.webhookSecret) return false;

  const expected = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');
  return signaturesMatch(expected, signature);
}

export { getClient as getRazorpayClient };
