import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';
import * as settings from '../config/settings.service.js';
import { resolveCustomerUploads, syncReviewMedia } from './reviewMedia.helper.js';

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

// A review straight from the product page. Anyone can write one — logged in or
// not, with or without a purchase — but it is always saved as PENDING, so it
// only appears on the site once an admin approves it. A logged-in customer is
// limited to one review per product, and gets the "verified" order link when
// they really did complete a booking for it.
export async function submitOpenReview(userId, { productId, reviewerName, reviewerCity, rating, title, comment, media }) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, title: true },
  });
  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  // Checked up front so a bad photo fails the whole submission instead of
  // leaving a text-only review behind.
  const photos = await resolveCustomerUploads(media);

  let orderId = null;
  if (userId) {
    const existing = await prisma.review.findFirst({ where: { productId, userId, source: 'CUSTOMER' }, select: { id: true } });
    if (existing) throw apiError(409, ERROR_CODES.CONFLICT, 'You have already reviewed this product');

    const order = await prisma.order.findFirst({
      where: { userId, kind: 'BOOKING', status: 'COMPLETED', items: { some: { productId } } },
      select: { id: true },
    });
    orderId = order?.id ?? null;
  }

  const review = await prisma.review.create({
    data: {
      productId,
      userId: userId || null,
      orderId,
      reviewerName,
      reviewerCity: reviewerCity || null,
      rating,
      title: title || null,
      comment,
      status: 'PENDING',
      source: 'CUSTOMER',
    },
    select: { id: true },
  });

  await syncReviewMedia(prisma.reviewMedia, review.id, photos);

  const notifyEmail = settings.get('orderNotifyEmail');
  if (notifyEmail) {
    sendMail({
      to: notifyEmail,
      template: 'review-submitted-admin',
      subject: `New review submitted — ${product.title}`,
      data: { productTitle: product.title, customerName: reviewerName, rating, title: title || null, comment },
    }).catch((err) => logger.error({ err, reviewId: review.id }, 'Failed to email admin about new review'));
  }

  return review;
}
