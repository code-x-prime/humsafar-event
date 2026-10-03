import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';
import { cancelShipmentForOrder, notifyDelivered } from './shopShipment.service.js';

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
  const where = { kind: 'SHOP', ...buildWhere({ status: query.status }, { filterFields: ['status'] }) };

  // One search box for everything an admin has to hand when someone calls:
  // order number, the customer's name / email / phone, the tracking number, or
  // the delivery phone / pincode.
  const q = query.search?.trim();
  if (q) {
    const contains = { contains: q, mode: 'insensitive' };
    where.OR = [
      { orderNumber: contains },
      { user: { is: { OR: [{ name: contains }, { email: contains }, { phone: contains }] } } },
      { shipment: { is: { awbCode: contains } } },
      { addressSnapshot: { path: ['phone'], string_contains: q } },
      { addressSnapshot: { path: ['pincode'], string_contains: q } },
    ];
  }
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.order.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

// How many orders sit in each status, for the tabs on the admin orders page,
// plus how many paid orders have a shipment that failed to reach Shiprocket.
export async function counts() {
  const grouped = await prisma.order.groupBy({ by: ['status'], where: { kind: 'SHOP' }, _count: { _all: true } });

  const byStatus = {};
  let all = 0;
  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
    all += row._count._all;
  }

  const shipmentIssues = await prisma.shopShipment.count({
    where: { status: 'FAILED', order: { status: { in: ['CONFIRMED', 'SHIPPED'] } } },
  });

  return { all, byStatus, shipmentIssues };
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

  // Marked delivered by hand (or the courier's confirmation arrived first):
  // the customer gets the same "delivered" email either way, only once.
  if (status === 'DELIVERED' && existing.status !== 'DELIVERED') {
    await notifyDelivered(order);
  }

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
