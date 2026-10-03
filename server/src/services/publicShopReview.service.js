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

// A review straight from the product page. Anyone can write one — logged in or
// not, with or without a purchase — but it is always saved as PENDING, so it
// only appears on the site once an admin approves it. A logged-in customer is
// limited to one review per product, and gets the "verified" order link when
// they really did receive an order containing it.
export async function submitOpenReview(userId, { productId, reviewerName, reviewerCity, rating, title, comment, media }) {
  const product = await prisma.shopProduct.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, title: true },
  });
  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  // Checked up front so a bad photo fails the whole submission instead of
  // leaving a text-only review behind.
  const photos = await resolveCustomerUploads(media);

  let orderId = null;
  if (userId) {
    const existing = await prisma.shopProductReview.findFirst({ where: { productId, userId, source: 'CUSTOMER' }, select: { id: true } });
    if (existing) throw apiError(409, ERROR_CODES.CONFLICT, 'You have already reviewed this product');

    const order = await prisma.order.findFirst({
      where: { userId, kind: 'SHOP', status: 'DELIVERED', items: { some: { shopProductId: productId } } },
      select: { id: true },
    });
    orderId = order?.id ?? null;
  }

  const review = await prisma.shopProductReview.create({
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

  await syncReviewMedia(prisma.shopProductReviewMedia, review.id, photos);

  const notifyEmail = settings.get('orderNotifyEmail');
  if (notifyEmail) {
    sendMail({
      to: notifyEmail,
      template: 'review-submitted-admin',
      subject: `New shop review submitted — ${product.title}`,
      data: { productTitle: product.title, customerName: reviewerName, rating, title: title || null, comment },
    }).catch((err) => logger.error({ err, reviewId: review.id }, 'Failed to email admin about new shop review'));
  }

  return review;
}
