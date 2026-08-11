import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function list(userId) {
  return prisma.address.findMany({
    where: { userId },
    include: { city: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getById(userId, id) {
  const address = await prisma.address.findFirst({ where: { id, userId }, include: { city: true } });
  if (!address) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Address not found');
  return address;
}

export async function create(userId, data) {
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  // First address a customer saves becomes their default automatically —
  // otherwise checkout would have nothing pre-selected on a first order.
  const existingCount = await prisma.address.count({ where: { userId } });
  const isDefault = data.isDefault || existingCount === 0;

  return prisma.address.create({ data: { ...data, userId, isDefault }, include: { city: true } });
}

export async function update(userId, id, data) {
  await getById(userId, id);

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  return prisma.address.update({ where: { id }, data, include: { city: true } });
}

export async function remove(userId, id) {
  const address = await getById(userId, id);
  await prisma.address.delete({ where: { id } });

  // If the deleted address was the default and other addresses remain,
  // promote the most recent one so checkout still has a default to preselect.
  if (address.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  return address;
}
