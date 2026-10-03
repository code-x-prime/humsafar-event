import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { syncReviewMedia, deleteReviewMediaFiles } from './reviewMedia.helper.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const INCLUDE = {
  product: { select: { id: true, title: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
  media: true,
};

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, {
    searchFields: ['title', 'comment', 'reviewerName', 'reviewerCity'],
    filterFields: ['status', 'productId', 'source'],
  });
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.review.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.review.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const review = await prisma.review.findUnique({ where: { id }, include: INCLUDE });
  if (!review) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Review not found');
  return review;
}

// Recomputes a product's denormalized avgRating/reviewCount from its
// currently APPROVED reviews — called whenever a review's status or rating
// changes, or one is added/deleted, since those are the only events that can
// move the numbers customers see on the product page.
async function recalcProductRating(productId) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      avgRating: agg._avg.rating || 0,
      reviewCount: agg._count,
    },
  });
}

// Admin-created review (feedback collected offline, etc.). It is attached to
// the creating admin's user row only to satisfy the userId relation — the
// name/city shown publicly come from reviewerName/reviewerCity.
export async function create(data, adminUserId) {
  const { media, createdAt, ...rest } = data;

  const product = await prisma.product.findUnique({ where: { id: rest.productId }, select: { id: true } });
  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  const review = await prisma.review.create({
    data: {
      ...rest,
      reviewerCity: rest.reviewerCity || null,
      userId: adminUserId,
      source: 'ADMIN',
      status: rest.status || 'APPROVED',
      createdAt: createdAt || undefined,
    },
  });

  await syncReviewMedia(prisma.reviewMedia, review.id, media);
  if (review.status === 'APPROVED') await recalcProductRating(review.productId);

  return getById(review.id);
}

export async function update(id, data) {
  const existing = await getById(id);
  const { media, ...rest } = data;

  // '' clears the city rather than storing a blank string.
  if (rest.reviewerCity === '') rest.reviewerCity = null;

  await prisma.review.update({ where: { id }, data: rest });
  await syncReviewMedia(prisma.reviewMedia, id, media);

  const statusChanged = rest.status && rest.status !== existing.status;
  const ratingChanged = rest.rating !== undefined && rest.rating !== existing.rating;
  if (statusChanged || ratingChanged) {
    await recalcProductRating(existing.productId);
  }

  return getById(id);
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.review.update({ where: { id }, data: { [field]: value }, include: INCLUDE });
}

export async function remove(id) {
  const review = await getById(id);
  await prisma.review.delete({ where: { id } });
  await recalcProductRating(review.productId);
  await deleteReviewMediaFiles(review.media);
  return review;
}
