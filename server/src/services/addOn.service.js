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

const INCLUDE = { category: true, _count: { select: { products: true } } };

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['name'], filterFields: ['isActive', 'categoryId'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.addOn.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.addOn.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const addOn = await prisma.addOn.findUnique({ where: { id }, include: INCLUDE });
  if (!addOn) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Add-on not found');
  return addOn;
}

export async function create(data) {
  return prisma.addOn.create({ data });
}

export async function update(id, data) {
  await getById(id);
  return prisma.addOn.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.addOn.update({ where: { id }, data: { [field]: value } });
}

export async function remove(id) {
  const addOn = await getById(id);
  await prisma.addOn.delete({ where: { id } });
  return addOn;
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.addOn.update({ where: { id }, data: { position } }))
  );
}
