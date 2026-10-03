import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

// Checkout that was started but never paid (tab closed, payment abandoned)
// leaves an order sitting in PENDING_PAYMENT. After an hour with no successful
// payment it is cancelled, so it stops showing up as pending in the admin and
// its slot hold is released.
//
// Cancelling is safe even if the customer is still mid-payment: if money does
// arrive later, the verify call or Razorpay's webhook reinstates the order
// (see markPaid in payment.checkout.service.js).
const ABANDON_AFTER_MS = 60 * 60 * 1000;
const BATCH_SIZE = 200;

export async function releaseAbandonedOrders() {
  const cutoff = new Date(Date.now() - ABANDON_AFTER_MS);

  const stale = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff }, payments: { none: { status: 'PAID' } } },
    select: { id: true },
    take: BATCH_SIZE,
  });
  if (stale.length === 0) return;

  const ids = stale.map((o) => o.id);
  const [cancelled] = await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: { in: ids }, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED', cancelReason: 'Payment not completed' },
    }),
    prisma.slotHold.updateMany({ where: { orderId: { in: ids }, status: 'ACTIVE' }, data: { status: 'RELEASED' } }),
  ]);

  logger.info({ cancelled: cancelled.count }, 'Cancelled abandoned unpaid orders');
}
