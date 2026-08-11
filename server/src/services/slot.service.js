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
  const where = buildWhere(query, { searchFields: ['label'], filterFields: ['cityId', 'isActive'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.timeSlot.findMany({ where, orderBy, skip, take, include: { city: true } }),
    prisma.timeSlot.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const slot = await prisma.timeSlot.findUnique({ where: { id }, include: { city: true } });
  if (!slot) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Time slot not found');
  return slot;
}

export async function create(data) {
  return prisma.timeSlot.create({ data });
}

export async function update(id, data) {
  await getById(id);
  return prisma.timeSlot.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.timeSlot.update({ where: { id }, data: { [field]: value } });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.timeSlot.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const slot = await getById(id);
  await prisma.timeSlot.delete({ where: { id } });
  return slot;
}
