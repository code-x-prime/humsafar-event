import * as settings from '../config/settings.service.js';
import { ERROR_CODES } from '../config/constants.js';
import { logger } from '../config/logger.js';

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

function notConfiguredError() {
  const err = new Error('Shiprocket is not configured. Add credentials in Settings → Shipping.');
  err.status = 503;
  err.code = ERROR_CODES.NOT_CONFIGURED;
  return err;
}

function getConfig() {
  const cfg = settings.getGroup('SHIPPING');
  if (!cfg.shiprocketEmail || !cfg.shiprocketPassword) return null;
  return cfg;
}

export function isConfigured() {
  return getConfig() !== null;
}

// Shiprocket auth tokens are valid ~10 days; cached in memory and refreshed
// automatically once expired rather than logging in on every API call.
let cachedToken = null;
let cachedTokenExpiresAt = 0;
let cachedEmail = null;

async function getToken() {
  const cfg = getConfig();
  if (!cfg) throw notConfiguredError();

  if (cachedToken && cachedEmail === cfg.shiprocketEmail && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cfg.shiprocketEmail, password: cfg.shiprocketPassword }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.token) {
    const err = new Error(json.message || 'Shiprocket login failed — check the email/password in Settings → Shipping.');
    err.status = 502;
    err.code = ERROR_CODES.UPSTREAM_ERROR;
    throw err;
  }

  cachedToken = json.token;
  cachedEmail = cfg.shiprocketEmail;
  cachedTokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000; // refresh a day early
  return cachedToken;
}

async function request(path, { method = 'GET', body } = {}) {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.error({ path, status: res.status, response: json }, 'Shiprocket API call failed');
    const err = new Error(json.message || `Shiprocket API error (${res.status})`);
    err.status = 502;
    err.code = ERROR_CODES.UPSTREAM_ERROR;
    err.details = json;
    throw err;
  }

  return json;
}

export async function testConnection() {
  await getToken();
  return { ok: true };
}

// Creates a "custom" (already-paid, forward) order in Shiprocket, which
// returns a shiprocket order_id + shipment_id that later calls (AWB
// assignment, tracking, label/manifest generation) key off.
export async function createOrder(payload) {
  return request('/orders/create/adhoc', { method: 'POST', body: payload });
}

// Auto-assigns the best-rated serviceable courier and generates the AWB
// (tracking number) for a shipment — this is what "auto ship" calls right
// after order creation, and what the admin's "Assign Courier" button calls
// for orders left in manual mode.
export async function assignAwb(shipmentId, courierId) {
  return request('/courier/assign/awb', {
    method: 'POST',
    body: { shipment_id: shipmentId, ...(courierId ? { courier_id: courierId } : {}) },
  });
}

export async function requestPickup(shipmentId) {
  return request('/courier/generate/pickup', { method: 'POST', body: { shipment_id: [shipmentId] } });
}

export async function generateLabel(shipmentId) {
  return request('/courier/generate/label', { method: 'POST', body: { shipment_id: [shipmentId] } });
}

export async function generateManifest(shipmentId) {
  return request('/manifests/generate', { method: 'POST', body: { shipment_id: [shipmentId] } });
}

export async function cancelShipment(awbCode) {
  return request('/orders/cancel/shipment/awbs', { method: 'POST', body: { awbs: [awbCode] } });
}

// GET serviceability + estimated rate for a pincode pair — used for the
// admin's "check courier options" tool and can later back a checkout-time
// shipping estimate.
export async function checkServiceability({ pickupPincode, deliveryPincode, weightKg, codAmount }) {
  const params = new URLSearchParams({
    pickup_postcode: pickupPincode,
    delivery_postcode: deliveryPincode,
    weight: String(weightKg || 0.5),
    cod: codAmount ? '1' : '0',
  });
  return request(`/courier/serviceability?${params.toString()}`);
}

// Live tracking status for one shipment, by AWB — polled by the admin
// tracking-refresh action and the periodic sync job.
export async function trackByAwb(awbCode) {
  return request(`/courier/track/awb/${encodeURIComponent(awbCode)}`);
}
