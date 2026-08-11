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

export async function list(query, userId) {
  const { page, limit, skip, take } = getPagination(query);
  const where = {
    ...buildWhere(query, { searchFields: ['title', 'body'], filterFields: ['isRead', 'channel'] }),
    userId,
  };
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy, skip, take }),
    prisma.notification.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function markRead(id, userId) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Notification not found');
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllRead(userId) {
  const result = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return { count: result.count };
}
