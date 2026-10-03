import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import * as settings from '../config/settings.service.js';
import * as shiprocket from '../lib/shiprocket.js';
import { sendMail } from '../lib/email/index.js';
import { toIST } from '../utils/datetime.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Used when a product has no weight / size saved, so Shiprocket still gets a
// usable parcel instead of a rejected order.
const DEFAULT_WEIGHT_GRAMS = 200;
const DEFAULT_DIMENSION_CM = 10;

// Shipments that can still change — the ones the tracking sync keeps checking.
const IN_FLIGHT_STATUSES = ['AWB_ASSIGNED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];

// Maps Shiprocket's free-text "current_status" into our closed set.
const STATUS_MAP = {
  'NEW': 'AWB_ASSIGNED',
  'AWB ASSIGNED': 'AWB_ASSIGNED',
  'LABEL GENERATED': 'AWB_ASSIGNED',
  'PICKUP SCHEDULED': 'PICKUP_SCHEDULED',
  'PICKUP GENERATED': 'PICKUP_SCHEDULED',
  'PICKUP QUEUED': 'PICKUP_SCHEDULED',
  'OUT FOR PICKUP': 'PICKUP_SCHEDULED',
  'IN TRANSIT': 'IN_TRANSIT',
  'PICKED UP': 'IN_TRANSIT',
  'SHIPPED': 'IN_TRANSIT',
  'OUT FOR DELIVERY': 'OUT_FOR_DELIVERY',
  'DELIVERED': 'DELIVERED',
  'CANCELLED': 'CANCELLED',
  'CANCELED': 'CANCELLED',
};

// Returns null when Shiprocket has no tracking status yet, so a shipment that
// hasn't been picked up is never wrongly shown as "in transit". Anything
// unrecognised once tracking has started counts as in transit, so a moving
// parcel never looks stuck.
function mapStatus(raw) {
  if (!raw) return null;
  const s = String(raw).toUpperCase().trim();
  if (STATUS_MAP[s]) return STATUS_MAP[s];
  if (s.startsWith('RTO')) return 'RTO';
  if (s.includes('CANCEL')) return 'CANCELLED';
  return 'IN_TRANSIT';
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] || 'Customer', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

// Shiprocket wants a plain 10-digit number — customers type +91…, spaces, dashes.
function tenDigitPhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-10);
}

// Shiprocket sends local IST timestamps like "2026-10-04 12:30:00".
function parseShiprocketDate(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).trim().replace(' ', 'T')}+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Builds the order Shiprocket needs from our order: the real parcel weight and
// size from the products, the customer's email (Shiprocket requires one), a
// clean 10-digit phone, and the amount actually paid as the declared value.
async function buildShiprocketPayload(order) {
  const cfg = settings.getGroup('SHIPPING');
  const address = order.addressSnapshot;

  const [user, products] = await Promise.all([
    prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } }),
    prisma.shopProduct.findMany({
      where: { id: { in: order.items.map((i) => i.shopProductId).filter(Boolean) } },
      select: { id: true, weightGrams: true, lengthCm: true, breadthCm: true, heightCm: true },
    }),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));

  let weightGrams = 0;
  let length = 0;
  let breadth = 0;
  let height = 0;
  for (const item of order.items) {
    const p = productById.get(item.shopProductId);
    weightGrams += (p?.weightGrams || DEFAULT_WEIGHT_GRAMS) * item.qty;
    length = Math.max(length, Number(p?.lengthCm || DEFAULT_DIMENSION_CM));
    breadth = Math.max(breadth, Number(p?.breadthCm || DEFAULT_DIMENSION_CM));
    height += Number(p?.heightCm || DEFAULT_DIMENSION_CM) * item.qty; // items packed one on top of another
  }

  const { first, last } = splitName(address.fullName);

  return {
    order_id: order.orderNumber,
    order_date: toIST(order.createdAt).format('YYYY-MM-DD HH:mm'),
    pickup_location: cfg.pickupLocationName,
    billing_customer_name: first,
    billing_last_name: last,
    billing_address: address.line1,
    billing_address_2: [address.line2, address.landmark].filter(Boolean).join(', '),
    billing_city: address.city,
    billing_pincode: address.pincode,
    billing_state: address.state,
    billing_country: 'India',
    billing_email: user?.email || settings.get('orderNotifyEmail') || 'noreply@humsafarevent.com',
    billing_phone: tenDigitPhone(address.phone),
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.productSnapshot?.title || 'Product',
      sku: item.shopProductId,
      units: item.qty,
      selling_price: Number(item.unitPrice),
    })),
    payment_method: 'Prepaid',
    shipping_charges: Number(order.shippingCharge || 0),
    sub_total: Number(order.total),
    length,
    breadth,
    height,
    weight: Math.max(0.1, Math.round(weightGrams / 10) / 100),
  };
}

// Pushes a confirmed (paid) order to Shiprocket: creates the order there,
// and — unless the admin has left shipmentMode set to MANUAL — immediately
// assigns a courier + AWB too, so the order is fully trackable without any
// admin action. Failures are recorded on the ShopShipment row (status
// FAILED + error message) rather than thrown, since a Shiprocket outage
// shouldn't block the payment/order-confirmation response. Safe to call
// again after a failure: an order already created on Shiprocket is reused,
// never created twice.
export async function pushOrderToShiprocket(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');

  const cfg = settings.getGroup('SHIPPING');
  const configuredMode = cfg.shipmentMode === 'MANUAL' ? 'MANUAL' : 'AUTO';

  const shipment = await prisma.shopShipment.upsert({
    where: { orderId },
    update: { mode: configuredMode },
    create: { orderId, mode: configuredMode, status: 'PENDING' },
  });

  const fail = async (message) => {
    await prisma.shopShipment.update({ where: { id: shipment.id }, data: { status: 'FAILED', error: message } });
    return prisma.shopShipment.findUnique({ where: { id: shipment.id } });
  };

  if (!shiprocket.isConfigured()) return fail('Shiprocket is not configured in Settings → Shipping.');
  if (!cfg.pickupLocationName) return fail('Set the Shiprocket Pickup Location Nickname in Settings → Shipping.');

  try {
    let current = shipment;

    if (!shipment.shipmentId) {
      const created = await shiprocket.createOrder(await buildShiprocketPayload(order));

      current = await prisma.shopShipment.update({
        where: { id: shipment.id },
        data: {
          status: 'PENDING',
          shiprocketOrderId: String(created.order_id),
          shipmentId: String(created.shipment_id),
          rawResponse: created,
          error: null,
        },
      });
    }

    if (configuredMode === 'AUTO' && !current.awbCode) {
      await assignCourierAndNotify(current.id);
    }

    return prisma.shopShipment.findUnique({ where: { id: shipment.id } });
  } catch (err) {
    logger.error({ err, orderId }, 'Failed to push order to Shiprocket');
    // Keep the order's Shiprocket ids if it was created there — only the status changes.
    return fail(err.message);
  }
}

// Assigns a courier + AWB for a shipment that already exists in Shiprocket —
// called automatically right after order creation in AUTO mode, or manually
// by the admin (for MANUAL-mode orders, or to retry a failed auto-assign).
// Then asks the courier for a pickup and prepares the shipping label (both
// best-effort — if either fails the shipment is still assigned and the admin
// can retry it from the order screen), and emails the customer their tracking.
export async function assignCourierAndNotify(shipmentId, courierId) {
  const shipment = await prisma.shopShipment.findUnique({ where: { id: shipmentId }, include: { order: { include: { items: true } } } });
  if (!shipment) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shipment not found');
  if (!shipment.shipmentId) throw apiError(409, ERROR_CODES.CONFLICT, 'Order has not been pushed to Shiprocket yet');
  // A second assignment could book (and be charged for) another courier.
  if (shipment.awbCode) throw apiError(409, ERROR_CODES.CONFLICT, 'A courier is already assigned to this shipment');

  const result = await shiprocket.assignAwb(shipment.shipmentId, courierId);
  const awbData = result.response?.data;

  if (!awbData?.awb_code) {
    await prisma.shopShipment.update({
      where: { id: shipment.id },
      data: { error: result.message || 'Courier assignment did not return an AWB' },
    });
    throw apiError(502, ERROR_CODES.UPSTREAM_ERROR, 'Shiprocket did not return a tracking number — try again or assign manually from your Shiprocket dashboard.');
  }

  const updated = await prisma.shopShipment.update({
    where: { id: shipment.id },
    data: {
      status: 'AWB_ASSIGNED',
      awbCode: awbData.awb_code,
      courierName: awbData.courier_name,
      trackingUrl: `https://shiprocket.co/tracking/${awbData.awb_code}`,
      error: null,
    },
  });

  await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'SHIPPED' } });

  // Courier pickup and label: a hiccup here must not undo the assignment or
  // stop the customer's tracking email.
  await schedulePickup(shipment.id).catch((err) => logger.warn({ err, shipmentId }, 'Pickup request failed after courier assignment'));
  await getLabel(shipment.id).catch((err) => logger.warn({ err, shipmentId }, 'Label generation failed after courier assignment'));

  const user = await prisma.user.findUnique({ where: { id: shipment.order.userId } });
  if (user?.email) {
    sendMail({
      to: user.email,
      template: 'shop-order-shipped',
      subject: `Your order ${shipment.order.orderNumber} has shipped`,
      data: {
        orderNumber: shipment.order.orderNumber,
        customerName: user.name || shipment.order.addressSnapshot?.fullName || 'Customer',
        courierName: updated.courierName,
        awbCode: updated.awbCode,
        trackingUrl: updated.trackingUrl,
      },
    }).catch((err) => logger.error({ err, orderId: shipment.orderId }, 'Failed to email shipment tracking to customer'));
  }

  return prisma.shopShipment.findUnique({ where: { id: shipment.id } });
}

// Asks the courier to collect the parcel. Needed after an AWB is assigned —
// without it Shiprocket has a tracking number but nobody is coming to pick up.
export async function schedulePickup(shipmentId) {
  const shipment = await prisma.shopShipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shipment not found');
  if (!shipment.shipmentId || !shipment.awbCode) {
    throw apiError(409, ERROR_CODES.CONFLICT, 'Assign a courier first — a pickup can only be requested once there is a tracking number');
  }

  try {
    const result = await shiprocket.requestPickup(shipment.shipmentId);
    const scheduledFor = parseShiprocketDate(result?.response?.pickup_scheduled_date);

    return await prisma.shopShipment.update({
      where: { id: shipment.id },
      data: {
        // Never step a shipment backwards once the courier has already collected it.
        status: ['AWB_ASSIGNED', 'PENDING'].includes(shipment.status) ? 'PICKUP_SCHEDULED' : shipment.status,
        pickupScheduledAt: scheduledFor || shipment.pickupScheduledAt || new Date(),
        error: null,
      },
    });
  } catch (err) {
    await prisma.shopShipment.update({ where: { id: shipment.id }, data: { error: `Pickup: ${err.message}` } });
    throw err;
  }
}

// Returns a download link for the shipping label PDF (the sticker that goes on
// the parcel). Generated fresh each time so the link never goes stale.
export async function getLabel(shipmentId) {
  const shipment = await prisma.shopShipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shipment not found');
  if (!shipment.shipmentId || !shipment.awbCode) {
    throw apiError(409, ERROR_CODES.CONFLICT, 'Assign a courier first — the label is created once there is a tracking number');
  }

  const result = await shiprocket.generateLabel(shipment.shipmentId);
  const url = result?.label_url;
  if (!url) {
    throw apiError(502, ERROR_CODES.UPSTREAM_ERROR, 'Shiprocket could not create the label yet — please try again in a minute.');
  }

  await prisma.shopShipment.update({ where: { id: shipment.id }, data: { labelUrl: url } });
  return url;
}

// "Your order has been delivered" email — sent once, the first time an order
// reaches DELIVERED (from live tracking or when the admin marks it by hand).
export async function notifyDelivered(order) {
  const user = await prisma.user.findUnique({ where: { id: order.userId } });
  if (!user?.email) return;

  sendMail({
    to: user.email,
    template: 'shop-order-delivered',
    subject: `Your order ${order.orderNumber} has been delivered`,
    data: {
      orderNumber: order.orderNumber,
      customerName: user.name || order.addressSnapshot?.fullName || 'Customer',
      orderUrl: `${env.CLIENT_ORIGIN}/profile/shop-orders/${order.id}`,
    },
  }).catch((err) => logger.error({ err, orderId: order.id }, 'Failed to email delivery confirmation to customer'));
}

export async function refreshTracking(shipmentId) {
  const shipment = await prisma.shopShipment.findUnique({ where: { id: shipmentId }, include: { order: true } });
  if (!shipment) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shipment not found');
  if (!shipment.awbCode) throw apiError(409, ERROR_CODES.CONFLICT, 'No AWB assigned yet');

  const result = await shiprocket.trackByAwb(shipment.awbCode);
  const track = result.tracking_data?.shipment_track?.[0];
  const status = mapStatus(track?.current_status) ?? shipment.status;

  const updated = await prisma.shopShipment.update({
    where: { id: shipment.id },
    data: {
      status,
      lastTrackedAt: new Date(),
      deliveredAt: status === 'DELIVERED' ? shipment.deliveredAt || parseShiprocketDate(track?.delivered_date) || new Date() : shipment.deliveredAt,
      rawResponse: result,
    },
  });

  if (status === 'DELIVERED' && shipment.status !== 'DELIVERED' && shipment.order.status !== 'DELIVERED') {
    const order = await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } });
    await notifyDelivered(order);
  }

  if (status === 'RTO' && shipment.status !== 'RTO') {
    logger.warn({ orderId: shipment.orderId, awbCode: shipment.awbCode }, 'Shipment is being returned to origin (RTO)');
  }

  return updated;
}

// Keeps every shipment that is still moving up to date without anyone opening
// the admin: updates its status and, on delivery, marks the order delivered
// and emails the customer. Run on a schedule (see jobs/index.js). Shipments
// checked within the last two hours are skipped.
export async function syncActiveShipments() {
  if (!shiprocket.isConfigured()) return { checked: 0 };

  const recentlyChecked = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const due = await prisma.shopShipment.findMany({
    where: {
      awbCode: { not: null },
      status: { in: IN_FLIGHT_STATUSES },
      OR: [{ lastTrackedAt: null }, { lastTrackedAt: { lt: recentlyChecked } }],
    },
    orderBy: { lastTrackedAt: { sort: 'asc', nulls: 'first' } },
    select: { id: true },
    take: 50,
  });

  for (const { id } of due) {
    try {
      await refreshTracking(id);
    } catch (err) {
      logger.error({ err, shipmentId: id }, 'Tracking sync failed for a shipment');
    }
  }

  return { checked: due.length };
}

// Cancels a shipment on Shiprocket's side too — called whenever an order
// with an existing shipment gets cancelled (by the customer or the admin),
// so the courier pickup doesn't go ahead for an order nobody wants shipped
// anymore. Best-effort: if there's no AWB yet, or Shiprocket isn't
// configured, or the cancel call itself fails, the local order cancellation
// still proceeds — we just log it rather than blocking the customer/admin.
export async function cancelShipmentForOrder(orderId) {
  const shipment = await prisma.shopShipment.findUnique({ where: { orderId } });
  if (!shipment) return null;

  if (!shipment.awbCode || !shiprocket.isConfigured()) {
    return prisma.shopShipment.update({ where: { id: shipment.id }, data: { status: 'CANCELLED' } });
  }

  try {
    await shiprocket.cancelShipment(shipment.awbCode);
  } catch (err) {
    logger.error({ err, orderId, awbCode: shipment.awbCode }, 'Failed to cancel Shiprocket shipment — order is still being cancelled locally');
  }

  return prisma.shopShipment.update({ where: { id: shipment.id }, data: { status: 'CANCELLED' } });
}
