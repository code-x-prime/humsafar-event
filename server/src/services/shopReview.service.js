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
    prisma.shopProductReview.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.shopProductReview.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const review = await prisma.shopProductReview.findUnique({ where: { id }, include: INCLUDE });
  if (!review) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Review not found');
  return review;
}

async function recalcProductRating(productId) {
  const agg = await prisma.shopProductReview.aggregate({
    where: { productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.shopProduct.update({
    where: { id: productId },
    data: { avgRating: agg._avg.rating || 0, reviewCount: agg._count },
  });
}

// Admin-created review. It is attached to the creating admin's user row only
// to satisfy the userId relation — the name/city shown publicly come from
// reviewerName/reviewerCity.
export async function create(data, adminUserId) {
  const { media, createdAt, ...rest } = data;

  const product = await prisma.shopProduct.findUnique({ where: { id: rest.productId }, select: { id: true } });
  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  const review = await prisma.shopProductReview.create({
    data: {
      ...rest,
      reviewerCity: rest.reviewerCity || null,
      userId: adminUserId,
      source: 'ADMIN',
      status: rest.status || 'APPROVED',
      createdAt: createdAt || undefined,
    },
  });

  await syncReviewMedia(prisma.shopProductReviewMedia, review.id, media);
  if (review.status === 'APPROVED') await recalcProductRating(review.productId);

  return getById(review.id);
}

export async function update(id, data) {
  const existing = await getById(id);
  const { media, ...rest } = data;

  // '' clears the city rather than storing a blank string.
  if (rest.reviewerCity === '') rest.reviewerCity = null;

  await prisma.shopProductReview.update({ where: { id }, data: rest });
  await syncReviewMedia(prisma.shopProductReviewMedia, id, media);

  const statusChanged = rest.status && rest.status !== existing.status;
  const ratingChanged = rest.rating !== undefined && rest.rating !== existing.rating;
  if (statusChanged || ratingChanged) {
    await recalcProductRating(existing.productId);
  }

  return getById(id);
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.shopProductReview.update({ where: { id }, data: { [field]: value }, include: INCLUDE });
}

export async function remove(id) {
  const review = await getById(id);
  await prisma.shopProductReview.delete({ where: { id } });
  await recalcProductRating(review.productId);
  await deleteReviewMediaFiles(review.media);
  return review;
}
