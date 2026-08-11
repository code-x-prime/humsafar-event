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
  const where = buildWhere(query, { searchFields: ['question', 'answer'], filterFields: ['scope', 'refId'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.faqItem.findMany({ where, orderBy, skip, take }),
    prisma.faqItem.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const faq = await prisma.faqItem.findUnique({ where: { id } });
  if (!faq) throw apiError(404, ERROR_CODES.NOT_FOUND, 'FAQ not found');
  return faq;
}

export async function create(data) {
  return prisma.faqItem.create({ data });
}

export async function update(id, data) {
  await getById(id);
  return prisma.faqItem.update({ where: { id }, data });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.faqItem.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const faq = await getById(id);
  await prisma.faqItem.delete({ where: { id } });
  return faq;
}
