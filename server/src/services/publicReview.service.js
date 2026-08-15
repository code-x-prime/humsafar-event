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

// A customer can review a product only once — and only after a genuinely
// COMPLETED order of theirs contained it. This is checked fresh against the
// database every time (never trusted from the client), so there's no way to
// review something you didn't actually receive.
export async function submitReview(userId, { orderId, productId, rating, title, comment }) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, kind: 'BOOKING', status: 'COMPLETED' },
    include: { items: true },
  });

  if (!order) {
    throw apiError(403, ERROR_CODES.FORBIDDEN, 'You can only review products from a completed order of yours');
  }

  const hasProduct = order.items.some((item) => item.productId === productId);
  if (!hasProduct) {
    throw apiError(403, ERROR_CODES.FORBIDDEN, 'This product was not part of that order');
  }

  const existing = await prisma.review.findFirst({ where: { orderId, productId, userId } });
  if (existing) {
    throw apiError(409, ERROR_CODES.CONFLICT, 'You have already reviewed this product for this order');
  }

  const review = await prisma.review.create({
    data: { orderId, productId, userId, rating, title, comment, status: 'PENDING' },
    include: { product: { select: { title: true } }, user: { select: { name: true, email: true } } },
  });

  const notifyEmail = settings.get('orderNotifyEmail');
  if (notifyEmail) {
    sendMail({
      to: notifyEmail,
      template: 'review-submitted-admin',
      subject: `New review submitted — ${review.product.title}`,
      data: {
        productTitle: review.product.title,
        customerName: review.user.name || 'A customer',
        rating: review.rating,
        title: review.title,
        comment: review.comment,
      },
    }).catch((err) => logger.error({ err, reviewId: review.id }, 'Failed to email admin about new review'));
  }

  return review;
}

// GET /reviews/reviewable — every (order, product) pair this customer has
// completed and hasn't reviewed yet, so the client can show "Write a Review"
// only where it's actually allowed.
export async function getReviewableItems(userId) {
  const orders = await prisma.order.findMany({
    where: { userId, kind: 'BOOKING', status: 'COMPLETED' },
    include: { items: true },
  });

  const existingReviews = await prisma.review.findMany({
    where: { userId },
    select: { orderId: true, productId: true },
  });
  const reviewedKey = new Set(existingReviews.map((r) => `${r.orderId}:${r.productId}`));

  const reviewable = [];
  for (const order of orders) {
    for (const item of order.items) {
      const key = `${order.id}:${item.productId}`;
      if (!reviewedKey.has(key)) {
        reviewable.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          productId: item.productId,
          productTitle: item.productSnapshot?.title,
        });
      }
    }
  }

  return reviewable;
}
