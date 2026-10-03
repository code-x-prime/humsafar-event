import { verifyWebhookSignature, hasWebhookSecret } from '../lib/razorpay.js';
import * as paymentCheckoutService from '../services/payment.checkout.service.js';
import { logger } from '../config/logger.js';

export const handleWebhook = async (req, res) => {
  if (!hasWebhookSecret()) {
    // Not the sender's fault, so say exactly what to fix — otherwise this just
    // looks like "invalid signature" and nobody notices payments aren't syncing.
    logger.error('Razorpay webhook received but no Webhook Secret is saved in Settings → Payment — rejecting it');
    return res.status(400).json({ success: false, message: 'Webhook secret is not configured' });
  }

  const signature = req.headers['x-razorpay-signature'];
  const isValid = signature && req.rawBody && verifyWebhookSignature(req.rawBody, signature);

  if (!isValid) {
    logger.warn('Rejected Razorpay webhook with invalid or missing signature');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  // Ack immediately — Razorpay retries on non-2xx/slow responses, and our
  // handler is already idempotent, so there's no correctness reason to make
  // Razorpay wait on it.
  res.status(200).json({ success: true });

  paymentCheckoutService.handleWebhookEvent(req.body).catch((err) => logger.error({ err }, 'Webhook event handling failed'));
};
