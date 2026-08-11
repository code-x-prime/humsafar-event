import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { verifyPaymentSignature } from '../lib/razorpay.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';
import * as settings from '../config/settings.service.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Sends the order-confirmation emails (customer + admin) — fire-and-forget,
// never blocks the payment response. Called once, right after an order is
// first marked PAID (never on a later duplicate webhook/verify hit for the
// same payment, since those short-circuit before reaching this).
async function sendConfirmationEmails(order) {
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const user = await prisma.user.findUnique({ where: { id: order.userId } });

  const emailData = {
    orderNumber: order.orderNumber,
    customerName: user?.name || order.addressSnapshot?.fullName || 'Customer',
    total: Number(order.total).toFixed(2),
    amountPaid: Number(order.amountPaid).toFixed(2),
    amountDue: Number(order.amountDue).toFixed(2),
    eventDate: order.eventDate.toISOString().slice(0, 10),
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

// Converts an order's slot hold(s) into a real SlotBooking now that payment
// is confirmed, so capacity is permanently counted against this date/slot.
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

// The one place a Razorpay payment gets marked PAID and its order confirmed.
// Idempotent by design: Payment.razorpayPaymentId is a unique column, and we
// check "is this order already CONFIRMED/paid enough" before doing anything
// — so whether this fires from the client's post-checkout verify call, a
// webhook retry, or both racing each other, the order is only ever confirmed
// and emailed once.
async function markPaid({ order, payment, razorpayPaymentId, razorpaySignature, rawPayload, method }) {
  const result = await prisma.$transaction(async (tx) => {
    const freshOrder = await tx.order.findUnique({ where: { id: order.id }, include: { payments: true } });

    const alreadyRecorded = freshOrder.payments.some((p) => p.razorpayPaymentId === razorpayPaymentId);
    if (alreadyRecorded) {
      return { order: freshOrder, alreadyProcessed: true };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'PAID',
        method,
        rawPayload,
      },
    });

    const newAmountPaid = Number(freshOrder.amountPaid) + Number(payment.amount);
    const newAmountDue = Math.max(0, Number(freshOrder.total) - newAmountPaid);

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
      },
    });

    await convertSlotHold(updatedOrder, tx);

    if (updatedOrder.couponCode) {
      await tx.coupon.update({ where: { code: updatedOrder.couponCode }, data: { usedCount: { increment: 1 } } });
    }

    // The user's cart is what became this order — clear it now that checkout succeeded.
    const cart = await tx.cart.findFirst({ where: { userId: updatedOrder.userId } });
    if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return { order: updatedOrder, alreadyProcessed: false };
  });

  if (!result.alreadyProcessed) {
    sendConfirmationEmails(result.order).catch((err) => logger.error({ err }, 'Order confirmation email dispatch failed'));
  }

  return result.order;
}

// POST /checkout/orders/:orderId/verify — called by the client immediately
// after Razorpay's checkout.js reports success, carrying the three fields
// Razorpay hands back. We independently verify the signature server-side
// before trusting any of it (the client's word alone proves nothing).
export async function verifyPayment(userId, orderId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payments: true } });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');

  if (order.status === 'CONFIRMED') {
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
// client's browser tab is even still open after payment.
export async function handleWebhookEvent(event) {
  const paymentEntity = event.payload?.payment?.entity;
  if (!paymentEntity) return;

  const payment = await prisma.payment.findFirst({ where: { razorpayOrderId: paymentEntity.order_id }, include: { order: true } });
  if (!payment) {
    logger.warn({ razorpayOrderId: paymentEntity.order_id }, 'Webhook for unknown Razorpay order');
    return;
  }

  if (event.event === 'payment.captured') {
    if (payment.order.status === 'CONFIRMED') return; // already handled via the client verify call
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
// paying — releases the slot hold so the capacity isn't stuck reserved for
// SLOT_HOLD_MINUTES for no reason, and marks the order cancelled.
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
