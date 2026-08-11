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

const INCLUDE = { order: { select: { id: true, orderNumber: true, total: true } } };

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['razorpayOrderId', 'razorpayPaymentId'], filterFields: ['status', 'orderId'] });
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.payment.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: INCLUDE });
  if (!payment) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Payment not found');
  return payment;
}

export async function create(data) {
  return prisma.payment.create({ data, include: INCLUDE });
}

export async function update(id, data) {
  await getById(id);
  return prisma.payment.update({ where: { id }, data, include: INCLUDE });
}

export async function refund(id, refundAmount, refundId) {
  await getById(id);
  return prisma.payment.update({
    where: { id },
    data: { status: 'REFUNDED', refundAmount, refundId },
    include: INCLUDE,
  });
}

export async function remove(id) {
  const payment = await getById(id);
  await prisma.payment.delete({ where: { id } });
  return payment;
}
