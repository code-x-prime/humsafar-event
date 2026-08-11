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
  const where = buildWhere(query, { searchFields: ['name', 'phone', 'email'], filterFields: ['status', 'source'] });
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.enquiry.findMany({ where, orderBy, skip, take }),
    prisma.enquiry.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const enquiry = await prisma.enquiry.findUnique({ where: { id } });
  if (!enquiry) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Enquiry not found');
  return enquiry;
}

export async function create(data) {
  return prisma.enquiry.create({ data });
}

export async function update(id, data) {
  await getById(id);
  return prisma.enquiry.update({ where: { id }, data });
}

export async function remove(id) {
  const enquiry = await getById(id);
  await prisma.enquiry.delete({ where: { id } });
  return enquiry;
}
