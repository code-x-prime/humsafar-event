import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';
import * as settings from '../config/settings.service.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// A customer can review a shop product only once — and only after a
// genuinely DELIVERED order of theirs contained it, checked fresh against
// the database every time rather than trusted from the client.
export async function submitReview(userId, { orderId, productId, rating, title, comment }) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, kind: 'SHOP', status: 'DELIVERED' },
    include: { items: true },
  });

  if (!order) {
    throw apiError(403, ERROR_CODES.FORBIDDEN, 'You can only review products from a delivered order of yours');
  }

  const hasProduct = order.items.some((item) => item.shopProductId === productId);
  if (!hasProduct) {
    throw apiError(403, ERROR_CODES.FORBIDDEN, 'This product was not part of that order');
  }

  const existing = await prisma.shopProductReview.findFirst({ where: { orderId, productId, userId } });
  if (existing) {
    throw apiError(409, ERROR_CODES.CONFLICT, 'You have already reviewed this product for this order');
  }

  const review = await prisma.shopProductReview.create({
    data: { orderId, productId, userId, rating, title, comment, status: 'PENDING' },
    include: { product: { select: { title: true } }, user: { select: { name: true, email: true } } },
  });

  const notifyEmail = settings.get('orderNotifyEmail');
  if (notifyEmail) {
    sendMail({
      to: notifyEmail,
      template: 'review-submitted-admin',
      subject: `New shop review submitted — ${review.product.title}`,
      data: {
        productTitle: review.product.title,
        customerName: review.user.name || 'A customer',
        rating: review.rating,
        title: review.title,
        comment: review.comment,
      },
    }).catch((err) => logger.error({ err, reviewId: review.id }, 'Failed to email admin about new shop review'));
  }

  return review;
}

export async function getReviewableItems(userId) {
  const orders = await prisma.order.findMany({
    where: { userId, kind: 'SHOP', status: 'DELIVERED' },
    include: { items: true },
  });

  const existingReviews = await prisma.shopProductReview.findMany({
    where: { userId },
    select: { orderId: true, productId: true },
  });
  const reviewedKey = new Set(existingReviews.map((r) => `${r.orderId}:${r.productId}`));

  const reviewable = [];
  for (const order of orders) {
    for (const item of order.items) {
      const key = `${order.id}:${item.shopProductId}`;
      if (!reviewedKey.has(key)) {
        reviewable.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          productId: item.shopProductId,
          productTitle: item.productSnapshot?.title,
        });
      }
    }
  }

  return reviewable;
}
