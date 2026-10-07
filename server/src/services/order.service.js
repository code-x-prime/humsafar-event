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
  items: {
    include: {
      // So the admin can see what was ordered: the product's picture and blurb.
      product: {
        select: {
          shortDescription: true,
          media: {
            select: { url: true, type: true },
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            take: 5,
          },
        },
      },
    },
  },
  payments: true,
};

// An order stores its time slot as a plain id; the admin needs to see which
// slot (label and hours) it is, so it is looked up here and attached.
async function withTimeSlots(orders) {
  const list = Array.isArray(orders) ? orders : [orders];
  const ids = [...new Set(list.map((o) => o.timeSlotId).filter(Boolean))];
  const slots = ids.length
    ? await prisma.timeSlot.findMany({ where: { id: { in: ids } }, select: { id: true, label: true, startTime: true, endTime: true } })
    : [];
  const slotById = new Map(slots.map((s) => [s.id, s]));

  // An add-on snapshot keeps only id/name/price; its picture is looked up here.
  const addOnIds = [
    ...new Set(list.flatMap((o) => (o.items || []).flatMap((i) => (i.addOnsSnapshot || []).map((a) => a.id)))),
  ];
  const addOnRows = addOnIds.length
    ? await prisma.addOn.findMany({ where: { id: { in: addOnIds } }, select: { id: true, image: true } })
    : [];
  const imageByAddOn = new Map(addOnRows.map((a) => [a.id, a.image]));

  const attach = (o) => ({
    ...o,
    timeSlot: o.timeSlotId ? slotById.get(o.timeSlotId) ?? null : null,
    items: (o.items || []).map((i) => ({
      ...i,
      addOnsSnapshot: i.addOnsSnapshot
        ? i.addOnsSnapshot.map((a) => ({ ...a, image: imageByAddOn.get(a.id) ?? null }))
        : i.addOnsSnapshot,
    })),
  });
  return Array.isArray(orders) ? list.map(attach) : attach(orders);
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = { kind: 'BOOKING', ...buildWhere(query, { filterFields: ['status', 'cityId'] }) };

  // One search box for whatever the admin has to hand: the order number, or the
  // customer's name / email / phone, or the delivery phone / pincode.
  const q = query.search?.trim();
  if (q) {
    const contains = { contains: q, mode: 'insensitive' };
    where.OR = [
      { orderNumber: contains },
      { user: { is: { OR: [{ name: contains }, { email: contains }, { phone: contains }] } } },
      { addressSnapshot: { path: ['phone'], string_contains: q } },
      { addressSnapshot: { path: ['pincode'], string_contains: q } },
    ];
  }

  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.order.count({ where }),
  ]);

  return { items: await withTimeSlots(items), meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const order = await prisma.order.findFirst({ where: { id, kind: 'BOOKING' }, include: INCLUDE });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
  return withTimeSlots(order);
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
  return withTimeSlots(await prisma.order.update({ where: { id }, data, include: INCLUDE }));
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
    // Only an order that was actually confirmed took a place in the slot. An
    // unpaid one never did, so decrementing for it would free somebody else's
    // booking on the same slot.
    if (order.timeSlotId && ['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'].includes(existing.status)) {
      await prisma.slotBooking.updateMany({
        where: { date: order.eventDate, timeSlotId: order.timeSlotId, cityId: order.cityId, bookedCount: { gt: 0 } },
        data: { bookedCount: { decrement: 1 } },
      });
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

  return withTimeSlots(order);
}

export async function remove(id) {
  const order = await getById(id);
  await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
  return order;
}
