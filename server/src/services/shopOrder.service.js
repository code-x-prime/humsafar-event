import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';
import { cancelShipmentForOrder } from './shopShipment.service.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const INCLUDE = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  items: true,
  payments: true,
  shipment: true,
};

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = { kind: 'SHOP', ...buildWhere(query, { searchFields: ['orderNumber'], filterFields: ['status'] }) };
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.order.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const order = await prisma.order.findFirst({ where: { id, kind: 'SHOP' }, include: INCLUDE });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
  return order;
}

export async function update(id, data) {
  await getById(id);
  return prisma.order.update({ where: { id }, data, include: INCLUDE });
}

export async function updateStatus(id, status, cancelReason) {
  const existing = await getById(id);

  const order = await prisma.order.update({
    where: { id },
    data: { status, cancelReason: status === 'CANCELLED' ? cancelReason : undefined },
    include: INCLUDE,
  });

  if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
    // Cancel the Shiprocket shipment too, if one was ever created — an admin
    // cancelling from this screen should not require a separate trip to
    // Shiprocket's own dashboard to stop the pickup.
    if (order.shipment) {
      cancelShipmentForOrder(id).catch((err) => logger.error({ err, orderId: id }, 'Failed to cancel Shiprocket shipment on admin order cancel'));
    }

    if (order.user?.email) {
      sendMail({
        to: order.user.email,
        template: 'order-cancelled',
        subject: `Your order ${order.orderNumber} has been cancelled`,
        data: {
          orderNumber: order.orderNumber,
          customerName: order.user.name || 'Customer',
          reason: cancelReason || null,
          amountPaid: Number(order.amountPaid) > 0 ? Number(order.amountPaid).toFixed(2) : null,
        },
      }).catch((err) => logger.error({ err, orderId: id }, 'Failed to email shop order cancellation'));
    }
  }

  return order;
}
