import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { deleteObject } from '../lib/r2.js';
import { logger } from '../config/logger.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function safeDeleteR2Object(r2Key) {
  if (!r2Key) return;
  try {
    await deleteObject(r2Key);
  } catch (err) {
    logger.error({ err, r2Key }, 'Failed to delete R2 object during testimonial cleanup');
  }
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['name', 'message'], filterFields: ['isActive'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.testimonial.findMany({ where, orderBy, skip, take }),
    prisma.testimonial.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Testimonial not found');
  return testimonial;
}

export async function create(data) {
  return prisma.testimonial.create({ data });
}

// If the update replaces imageR2Key with a different value (or clears it),
// the previous R2 object is deleted so it doesn't sit orphaned in the bucket.
export async function update(id, data) {
  const existing = await getById(id);

  if ('imageR2Key' in data && data.imageR2Key !== existing.imageR2Key) {
    await safeDeleteR2Object(existing.imageR2Key);
  }

  return prisma.testimonial.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.testimonial.update({ where: { id }, data: { [field]: value } });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.testimonial.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const testimonial = await getById(id);
  await safeDeleteR2Object(testimonial.imageR2Key);
  await prisma.testimonial.delete({ where: { id } });
  return testimonial;
}

// GET /api/v1/testimonials — active testimonials in position order, for the
// home page carousel.
export async function getPublicTestimonials() {
  return prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
    select: { id: true, name: true, city: true, message: true, image: true, rating: true },
  });
}
