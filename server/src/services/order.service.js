import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { nowUTC } from '../utils/datetime.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';
import * as settings from '../config/settings.service.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const INCLUDE = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  city: true,
  items: true,
  payments: true,
};

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = { kind: 'BOOKING', ...buildWhere(query, { searchFields: ['orderNumber'], filterFields: ['status', 'cityId'] }) };
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.order.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const order = await prisma.order.findFirst({ where: { id, kind: 'BOOKING' }, include: INCLUDE });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
  return order;
}

function generateOrderNumber() {
  const now = nowUTC();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `HE-${yyyymm}-${rand}`;
}

export async function create(data) {
  const amountDue = data.total - (data.amountPaid || 0);
  return prisma.order.create({
    data: { ...data, kind: 'BOOKING', orderNumber: generateOrderNumber(), amountDue },
    include: INCLUDE,
  });
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
    // Free up the slot capacity this order was holding, same as a customer
    // cancelling their own unpaid order — an admin cancellation shouldn't
    // leave the slot permanently blocked.
    await prisma.slotHold.updateMany({ where: { orderId: id, status: 'ACTIVE' }, data: { status: 'RELEASED' } });
    if (order.timeSlotId) {
      await prisma.slotBooking
        .update({
          where: { date_timeSlotId_cityId: { date: order.eventDate, timeSlotId: order.timeSlotId, cityId: order.cityId } },
          data: { bookedCount: { decrement: 1 } },
        })
        .catch(() => {}); // no booking row yet (order was never paid) — nothing to decrement
    }

    if (order.user?.email) {
      sendMail({
        to: order.user.email,
        template: 'order-cancelled',
        subject: `Your booking ${order.orderNumber} has been cancelled`,
        data: {
          orderNumber: order.orderNumber,
          customerName: order.user.name || 'Customer',
          reason: cancelReason || null,
          amountPaid: Number(order.amountPaid) > 0 ? Number(order.amountPaid).toFixed(2) : null,
        },
      }).catch((err) => logger.error({ err, orderId: id }, 'Failed to email order cancellation'));
    }
  }

  if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
    if (order.user?.email) {
      sendMail({
        to: order.user.email,
        template: 'order-completed',
        subject: `Your booking ${order.orderNumber} is complete!`,
        data: { orderNumber: order.orderNumber, customerName: order.user.name || 'Customer' },
      }).catch((err) => logger.error({ err, orderId: id }, 'Failed to email order completion to customer'));
    }

    const notifyEmail = settings.get('orderNotifyEmail');
    if (notifyEmail) {
      sendMail({
        to: notifyEmail,
        template: 'order-completed-admin',
        subject: `Booking ${order.orderNumber} marked complete`,
        data: {
          orderNumber: order.orderNumber,
          customerName: order.user?.name || order.user?.email || 'Customer',
          total: Number(order.total).toFixed(2),
        },
      }).catch((err) => logger.error({ err, orderId: id }, 'Failed to email admin about order completion'));
    }
  }

  return order;
}

export async function remove(id) {
  const order = await getById(id);
  await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
  return order;
}
