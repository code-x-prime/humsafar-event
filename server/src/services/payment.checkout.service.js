import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { verifyPaymentSignature } from '../lib/razorpay.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';
import * as settings from '../config/settings.service.js';
import { pushOrderToShiprocket, cancelShipmentForOrder } from './shopShipment.service.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Sends the booking-confirmation emails (customer + admin) — fire-and-forget,
// never blocks the payment response. Called once, right after a BOOKING
// order is first marked PAID.
async function sendBookingConfirmationEmails(order) {
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const user = await prisma.user.findUnique({ where: { id: order.userId } });

  const emailData = {
    orderNumber: order.orderNumber,
    customerName: user?.name || order.addressSnapshot?.fullName || 'Customer',
    total: Number(order.total).toFixed(2),
    amountPaid: Number(order.amountPaid).toFixed(2),
    amountDue: Number(order.amountDue).toFixed(2),
    eventDate: order.eventDate?.toISOString().slice(0, 10),
    address: order.addressSnapshot,
    items: items.map((i) => ({
      title: i.productSnapshot?.title,
      variant: i.productSnapshot?.variant?.name,
      qty: i.qty,
      subtotal: Number(i.subtotal).toFixed(2),
      addOns: (i.addOnsSnapshot || []).map((a) => a.name).join(', '),
    })),
  };

  if (user?.email) {
    sendMail({
      to: user.email,
      template: 'order-confirmation-customer',
      subject: `Your Humsafar Events booking ${order.orderNumber} is confirmed`,
      data: emailData,
    }).catch((err) => logger.error({ err, orderId: order.id }, 'Failed to email customer order confirmation'));
  }

  const notifyEmail = settings.get('orderNotifyEmail');
  if (notifyEmail) {
    sendMail({
      to: notifyEmail,
      template: 'order-confirmation-admin',
      subject: `New booking ${order.orderNumber} — ₹${emailData.amountPaid} paid`,
      data: { ...emailData, customerPhone: user?.phone },
    }).catch((err) => logger.error({ err, orderId: order.id }, 'Failed to email admin order notification'));
  }
}

// Sends the Shop With Us confirmation emails — same fire-and-forget pattern,
// called once right after a SHOP order is first marked PAID.
async function sendShopConfirmationEmails(order) {
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const user = await prisma.user.findUnique({ where: { id: order.userId } });
  const cfg = settings.getGroup('SHIPPING');

  const emailData = {
    orderNumber: order.orderNumber,
    customerName: user?.name || order.addressSnapshot?.fullName || 'Customer',
    subtotal: Number(order.subtotal).toFixed(2),
    taxAmount: Number(order.taxAmount) > 0 ? Number(order.taxAmount).toFixed(2) : null,
    total: Number(order.total).toFixed(2),
    address: order.addressSnapshot,
    items: items.map((i) => ({
      title: i.productSnapshot?.title,
      qty: i.qty,
      subtotal: Number(i.subtotal).toFixed(2),
    })),
  };

  if (user?.email) {
    sendMail({
      to: user.email,
      template: 'shop-order-confirmation-customer',
      subject: `Your order ${order.orderNumber} is confirmed`,
      data: emailData,
    }).catch((err) => logger.error({ err, orderId: order.id }, 'Failed to email customer shop order confirmation'));
  }

  const notifyEmail = settings.get('orderNotifyEmail');
  if (notifyEmail) {
    sendMail({
      to: notifyEmail,
      template: 'shop-order-confirmation-admin',
      subject: `New shop order ${order.orderNumber} — ₹${emailData.total} paid`,
      data: { ...emailData, customerPhone: user?.phone, shipmentMode: cfg.shipmentMode === 'MANUAL' ? 'Manual' : 'Auto' },
    }).catch((err) => logger.error({ err, orderId: order.id }, 'Failed to email admin shop order notification'));
  }
}

// Converts an order's slot hold(s) into a real SlotBooking now that payment
// is confirmed, so capacity is permanently counted against this date/slot.
// BOOKING orders only — a no-op for SHOP orders (no timeSlotId/cityId).
async function convertSlotHold(order, tx) {
  if (!order.timeSlotId) return;

  const hold = await tx.slotHold.findFirst({ where: { orderId: order.id, status: 'ACTIVE' } });
  if (!hold) return;

  await tx.slotHold.update({ where: { id: hold.id }, data: { status: 'CONVERTED' } });

  await tx.slotBooking.upsert({
    where: { date_timeSlotId_cityId: { date: order.eventDate, timeSlotId: order.timeSlotId, cityId: order.cityId } },
    update: { bookedCount: { increment: 1 } },
    create: { date: order.eventDate, timeSlotId: order.timeSlotId, cityId: order.cityId, bookedCount: 1 },
  });
}

// The one place a Razorpay payment gets marked PAID and its order confirmed
// — for both BOOKING and SHOP orders, since they now share the same Order/
// Payment/Cart tables. Idempotent by design: Payment.razorpayPaymentId is a
// unique column, and we check "is this payment id already recorded" before
// doing anything — so whether this fires from the client's post-checkout
// verify call, a webhook retry, or both racing each other, the order is only
// ever confirmed and emailed once.
async function markPaid({ order, payment, razorpayPaymentId, razorpaySignature, rawPayload, method }) {
  const result = await prisma.$transaction(async (tx) => {
    // Atomic, race-proof idempotency guard: only one of N concurrent callers
    // (client verify + webhook retries racing each other) can flip this
    // specific Payment row from non-PAID to PAID — Postgres serializes
    // concurrent UPDATEs on the same row, and the "already PAID" condition
    // in the WHERE clause is re-checked at the moment each writer actually
    // gets the row lock, not against a stale snapshot read earlier in the
    // transaction. A plain read-then-write check (SELECT, then decide) is
    // NOT safe here — under READ COMMITTED, multiple transactions can all
    // read "not yet paid" before any of them commits, and would all think
    // they're the first to process it (this used to double-send emails).
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: 'PAID' } },
      data: { razorpayPaymentId, razorpaySignature, status: 'PAID', method, rawPayload },
    });

    if (count === 0) {
      const freshOrder = await tx.order.findUnique({ where: { id: order.id } });
      return { order: freshOrder, alreadyProcessed: true };
    }

    const freshOrder = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
    const newAmountPaid = Number(freshOrder.amountPaid) + Number(payment.amount);
    const newAmountDue = Math.max(0, Number(freshOrder.total) - newAmountPaid);

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED', amountPaid: newAmountPaid, amountDue: newAmountDue },
    });

    if (updatedOrder.kind === 'BOOKING') {
      await convertSlotHold(updatedOrder, tx);

      if (updatedOrder.couponCode) {
        await tx.coupon.update({ where: { code: updatedOrder.couponCode }, data: { usedCount: { increment: 1 } } });
      }
    } else {
      // SHOP: decrement stock for each item now that the order is genuinely paid for.
      for (const item of freshOrder.items) {
        if (item.shopProductId) {
          await tx.shopProduct.update({ where: { id: item.shopProductId }, data: { stock: { decrement: item.qty } } });
        }
      }
    }

    // The user's cart is what became this order — clear only the lines of
    // the matching kind, since one cart can hold both BOOKING and SHOP items
    // and only one of them just became this order.
    const cart = await tx.cart.findFirst({ where: { userId: updatedOrder.userId } });
    if (cart) {
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          ...(updatedOrder.kind === 'BOOKING' ? { productId: { not: null } } : { shopProductId: { not: null } }),
        },
      });
    }

    return { order: updatedOrder, alreadyProcessed: false };
  });

  if (!result.alreadyProcessed) {
    if (result.order.kind === 'BOOKING') {
      sendBookingConfirmationEmails(result.order).catch((err) => logger.error({ err }, 'Booking confirmation email dispatch failed'));
    } else {
      sendShopConfirmationEmails(result.order).catch((err) => logger.error({ err }, 'Shop order confirmation email dispatch failed'));
      pushOrderToShiprocket(result.order.id).catch((err) => logger.error({ err, orderId: result.order.id }, 'Shiprocket push failed after payment'));
    }
  }

  return result.order;
}

// POST /checkout/orders/:orderId/verify — called by the client immediately
// after Razorpay's checkout.js reports success, carrying the three fields
// Razorpay hands back. We independently verify the signature server-side
// before trusting any of it (the client's word alone proves nothing). Used
// by both the booking and shop checkout flows — orderId alone disambiguates.
export async function verifyPayment(userId, orderId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payments: true } });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');

  if (['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
    return order; // already verified — most likely a duplicate client call after a slow response
  }

  const payment = order.payments.find((p) => p.razorpayOrderId === razorpayOrderId);
  if (!payment) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Payment record not found for this order');

  const isValid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  if (!isValid) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Payment verification failed — please contact support if money was deducted');
  }

  return markPaid({ order, payment, razorpayPaymentId, razorpaySignature, method: 'razorpay' });
}

// Called from the Razorpay webhook route (payment.captured / payment.failed
// events) — the authoritative confirmation path independent of whether the
// client's browser tab is even still open after payment. Booking and Shop
// orders now share the same Payment table, so a single lookup covers both.
export async function handleWebhookEvent(event) {
  const paymentEntity = event.payload?.payment?.entity;
  if (!paymentEntity) return;

  const payment = await prisma.payment.findFirst({ where: { razorpayOrderId: paymentEntity.order_id }, include: { order: true } });
  if (!payment) {
    logger.warn({ razorpayOrderId: paymentEntity.order_id }, 'Webhook for unknown Razorpay order');
    return;
  }

  if (event.event === 'payment.captured') {
    if (['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(payment.order.status)) return; // already handled via the client verify call
    await markPaid({
      order: payment.order,
      payment,
      razorpayPaymentId: paymentEntity.id,
      razorpaySignature: null,
      rawPayload: event,
      method: paymentEntity.method,
    });
  } else if (event.event === 'payment.failed') {
    if (payment.status === 'PAID') return; // don't downgrade an already-successful payment
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', rawPayload: event } });
  }
}

// Called when the customer abandons checkout or explicitly cancels before
// paying — releases the slot hold (BOOKING only) so capacity isn't stuck
// reserved for no reason, and marks the order cancelled. Works for both
// kinds; SHOP orders simply have no slot holds to release.
export async function cancelUnpaidOrder(userId, orderId) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
  if (order.status !== 'PENDING_PAYMENT') {
    throw apiError(409, ERROR_CODES.CONFLICT, 'Only unpaid orders can be cancelled this way');
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
    prisma.slotHold.updateMany({ where: { orderId: order.id, status: 'ACTIVE' }, data: { status: 'RELEASED' } }),
  ]);

  return { cancelled: true };
}

// Customer-initiated cancellation of an already-paid order (before it's
// delivered/completed) — requires a reason, cancels the Shiprocket shipment
// if this was a SHOP order that had one, and notifies the admin so a refund
// can be issued outside this flow (no auto-refund via Razorpay yet, for
// either order kind).
export async function cancelPaidOrder(userId, orderId, reason) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { shipment: true } });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');

  if (['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
    throw apiError(409, ERROR_CODES.CONFLICT, `An order that's already ${order.status.toLowerCase()} can't be cancelled`);
  }

  const hadShipment = Boolean(order.shipment?.awbCode);
  if (order.shipment) {
    await cancelShipmentForOrder(order.id);
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED', cancelReason: reason },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user?.email) {
    sendMail({
      to: user.email,
      template: 'order-cancelled',
      subject: `Your order ${order.orderNumber} has been cancelled`,
      data: {
        orderNumber: order.orderNumber,
        customerName: user.name || 'Customer',
        reason,
        amountPaid: Number(order.amountPaid) > 0 ? Number(order.amountPaid).toFixed(2) : null,
      },
    }).catch((err) => logger.error({ err, orderId: order.id }, 'Failed to email customer cancellation confirmation'));
  }

  const notifyEmail = settings.get('orderNotifyEmail');
  if (notifyEmail) {
    sendMail({
      to: notifyEmail,
      template: order.kind === 'SHOP' ? 'shop-order-cancelled-admin' : 'order-cancelled-admin',
      subject: `Order ${order.orderNumber} cancelled by customer`,
      data: {
        orderNumber: order.orderNumber,
        customerName: user?.name || user?.email || 'Customer',
        customerPhone: user?.phone,
        reason,
        amountPaid: Number(order.amountPaid).toFixed(2),
        hadShipment,
      },
    }).catch((err) => logger.error({ err, orderId: order.id }, 'Failed to email admin about customer cancellation'));
  }

  return updated;
}
