import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { logger } from '../config/logger.js';
import * as settings from '../config/settings.service.js';
import * as shiprocket from '../lib/shiprocket.js';
import { sendMail } from '../lib/email/index.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Maps Shiprocket's free-text "current_status" into our closed set — falls
// back to IN_TRANSIT for anything unrecognized so a shipment never gets
// silently stuck showing PENDING while it's actually moving.
const STATUS_MAP = {
  'NEW': 'AWB_ASSIGNED',
  'AWB ASSIGNED': 'AWB_ASSIGNED',
  'PICKUP SCHEDULED': 'PICKUP_SCHEDULED',
  'PICKUP GENERATED': 'PICKUP_SCHEDULED',
  'IN TRANSIT': 'IN_TRANSIT',
  'SHIPPED': 'IN_TRANSIT',
  'OUT FOR DELIVERY': 'OUT_FOR_DELIVERY',
  'DELIVERED': 'DELIVERED',
  'RTO INITIATED': 'RTO',
  'RTO DELIVERED': 'RTO',
  'CANCELLED': 'CANCELLED',
  'CANCELED': 'CANCELLED',
};

function mapStatus(raw) {
  if (!raw) return 'IN_TRANSIT';
  return STATUS_MAP[String(raw).toUpperCase()] || 'IN_TRANSIT';
}

function buildShiprocketPayload(order) {
  const cfg = settings.getGroup('SHIPPING');
  const address = order.addressSnapshot;

  return {
    order_id: order.orderNumber,
    order_date: order.createdAt.toISOString().slice(0, 10),
    pickup_location: cfg.pickupLocationName,
    billing_customer_name: address.fullName,
    billing_last_name: '',
    billing_address: address.line1,
    billing_address_2: [address.line2, address.landmark].filter(Boolean).join(', '),
    billing_city: address.city,
    billing_pincode: address.pincode,
    billing_state: address.state,
    billing_country: 'India',
    billing_phone: address.phone,
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.productSnapshot?.title || 'Product',
      sku: item.shopProductId,
      units: item.qty,
      selling_price: Number(item.unitPrice),
    })),
    payment_method: 'Prepaid',
    sub_total: Number(order.subtotal),
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
  };
}

// Pushes a confirmed (paid) order to Shiprocket: creates the order there,
// and — unless the admin has left shipmentMode set to MANUAL — immediately
// assigns a courier + AWB too, so the order is fully trackable without any
// admin action. Failures are recorded on the ShopShipment row (status
// FAILED + error message) rather than thrown, since a Shiprocket outage
// shouldn't block the payment/order-confirmation response.
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

  if (!shiprocket.isConfigured()) {
    return prisma.shopShipment.update({
      where: { id: shipment.id },
      data: { status: 'FAILED', error: 'Shiprocket is not configured in Settings → Shipping.' },
    });
  }

  try {
    const created = await shiprocket.createOrder(buildShiprocketPayload(order));

    const updated = await prisma.shopShipment.update({
      where: { id: shipment.id },
      data: {
        status: 'PENDING',
        shiprocketOrderId: String(created.order_id),
        shipmentId: String(created.shipment_id),
        rawResponse: created,
        error: null,
      },
    });

    if (configuredMode === 'AUTO') {
      await assignCourierAndNotify(updated.id);
    }

    return prisma.shopShipment.findUnique({ where: { id: shipment.id } });
  } catch (err) {
    logger.error({ err, orderId }, 'Failed to push order to Shiprocket');
    await prisma.shopShipment.update({
      where: { id: shipment.id },
      data: { status: 'FAILED', error: err.message },
    });
    return prisma.shopShipment.findUnique({ where: { id: shipment.id } });
  }
}

// Assigns a courier + AWB for a shipment that already exists in Shiprocket —
// called automatically right after order creation in AUTO mode, or manually
// by the admin (for MANUAL-mode orders, or to retry a failed auto-assign).
export async function assignCourierAndNotify(shipmentId, courierId) {
  const shipment = await prisma.shopShipment.findUnique({ where: { id: shipmentId }, include: { order: { include: { items: true } } } });
  if (!shipment) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shipment not found');
  if (!shipment.shipmentId) throw apiError(409, ERROR_CODES.CONFLICT, 'Order has not been pushed to Shiprocket yet');

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

  return updated;
}

export async function refreshTracking(shipmentId) {
  const shipment = await prisma.shopShipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shipment not found');
  if (!shipment.awbCode) throw apiError(409, ERROR_CODES.CONFLICT, 'No AWB assigned yet');

  const result = await shiprocket.trackByAwb(shipment.awbCode);
  const tracking = result.tracking_data;
  const rawStatus = tracking?.shipment_track?.[0]?.current_status;
  const status = mapStatus(rawStatus);

  const updated = await prisma.shopShipment.update({
    where: { id: shipment.id },
    data: {
      status,
      lastTrackedAt: new Date(),
      deliveredAt: status === 'DELIVERED' ? new Date() : shipment.deliveredAt,
      rawResponse: result,
    },
  });

  if (status === 'DELIVERED' && shipment.status !== 'DELIVERED') {
    await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } });
  }

  return updated;
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
