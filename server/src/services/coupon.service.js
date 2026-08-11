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

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['code'], filterFields: ['type', 'isActive'] });
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.coupon.findMany({ where, orderBy, skip, take }),
    prisma.coupon.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(code) {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Coupon not found');
  return coupon;
}

export async function create(data) {
  return prisma.coupon.create({ data });
}

export async function update(code, data) {
  await getById(code);
  return prisma.coupon.update({ where: { code }, data });
}

export async function toggle(code, field, value) {
  await getById(code);
  return prisma.coupon.update({ where: { code }, data: { [field]: value } });
}

export async function remove(code) {
  const coupon = await getById(code);
  await prisma.coupon.delete({ where: { code } });
  return coupon;
}
