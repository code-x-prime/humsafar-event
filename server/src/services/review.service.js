import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const INCLUDE = {
  product: { select: { id: true, title: true } },
  user: { select: { id: true, name: true } },
  media: true,
};

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['title', 'comment'], filterFields: ['status', 'productId'] });
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

export async function create(data) {
  return prisma.review.create({ data, include: INCLUDE });
}

export async function update(id, data) {
  const existing = await getById(id);
  const updated = await prisma.review.update({ where: { id }, data, include: INCLUDE });

  if (data.status && data.status !== existing.status) {
    await recalcProductRating(existing.productId);
  }

  return updated;
}

// Recomputes a product's denormalized avgRating/reviewCount from its
// currently APPROVED reviews — called whenever a review's status changes or
// a review is deleted, since those are the only events that can move the
// numbers customers see on the product page.
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

export async function toggle(id, field, value) {
  const review = await getById(id);
  const updated = await prisma.review.update({ where: { id }, data: { [field]: value }, include: INCLUDE });

  if (field === 'status') {
    await recalcProductRating(review.productId);
  }

  return updated;
}

export async function remove(id) {
  const review = await getById(id);
  await prisma.review.delete({ where: { id } });
  await recalcProductRating(review.productId);
  return review;
}
