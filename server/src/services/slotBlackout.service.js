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
  const where = buildWhere(query, { searchFields: ['reason'], filterFields: ['cityId', 'timeSlotId'] });
  const orderBy = buildOrderBy(query, 'date', 'desc');

  const [items, total] = await Promise.all([
    prisma.slotBlackout.findMany({ where, orderBy, skip, take, include: { city: true, timeSlot: true } }),
    prisma.slotBlackout.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const blackout = await prisma.slotBlackout.findUnique({ where: { id }, include: { city: true, timeSlot: true } });
  if (!blackout) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Slot blackout not found');
  return blackout;
}

export async function create(data) {
  return prisma.slotBlackout.create({ data });
}

export async function update(id, data) {
  await getById(id);
  return prisma.slotBlackout.update({ where: { id }, data });
}

export async function remove(id) {
  const blackout = await getById(id);
  await prisma.slotBlackout.delete({ where: { id } });
  return blackout;
}
