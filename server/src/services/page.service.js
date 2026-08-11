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
  const where = buildWhere(query, { searchFields: ['title', 'slug'], filterFields: ['isPublished'] });
  const orderBy = buildOrderBy(query, 'updatedAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.page.findMany({ where, orderBy, skip, take }),
    prisma.page.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Page not found');
  return page;
}

export async function create(data) {
  return prisma.page.create({ data });
}

export async function update(id, data) {
  await getById(id);
  return prisma.page.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.page.update({ where: { id }, data: { [field]: value } });
}

export async function remove(id) {
  const page = await getById(id);
  await prisma.page.delete({ where: { id } });
  return page;
}
