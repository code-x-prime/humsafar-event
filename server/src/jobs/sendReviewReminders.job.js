import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { sendMail } from '../lib/email/index.js';
import { nowUTC } from '../utils/datetime.js';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

// 12 hours after an order is marked COMPLETED, emails the customer asking
// for a review of what they booked. `reviewReminderSentAt` guards against
// sending it twice — set the moment the email is dispatched, checked here
// as "still null" so this job is safe to run as often as we like.
export async function sendReviewReminders() {
  const cutoff = new Date(Date.now() - TWELVE_HOURS_MS);

  const orders = await prisma.order.findMany({
    where: { status: 'COMPLETED', reviewReminderSentAt: null, updatedAt: { lte: cutoff } },
    include: { items: true, user: { select: { name: true, email: true } } },
  });

  for (const order of orders) {
    if (!order.user?.email) continue;

    const productTitles = [...new Set(order.items.map((i) => i.productSnapshot?.title).filter(Boolean))];

    try {
      await sendMail({
        to: order.user.email,
        template: 'review-request',
        subject: 'How was your Humsafar Events booking?',
        data: {
          customerName: order.user.name || 'Customer',
          orderNumber: order.orderNumber,
          products: productTitles,
        },
      });
      await prisma.order.update({ where: { id: order.id }, data: { reviewReminderSentAt: nowUTC() } });
    } catch (err) {
      logger.error({ err, orderId: order.id }, 'Failed to send review reminder email');
    }
  }

  if (orders.length > 0) {
    logger.info(`Sent ${orders.length} review reminder email(s)`);
  }
}
