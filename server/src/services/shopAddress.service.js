import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function list(userId) {
  return prisma.shopAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getById(userId, id) {
  const address = await prisma.shopAddress.findFirst({ where: { id, userId } });
  if (!address) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Address not found');
  return address;
}

export async function create(userId, data) {
  if (data.isDefault) {
    await prisma.shopAddress.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  const existingCount = await prisma.shopAddress.count({ where: { userId } });
  const isDefault = data.isDefault || existingCount === 0;

  return prisma.shopAddress.create({ data: { ...data, userId, isDefault } });
}

export async function update(userId, id, data) {
  await getById(userId, id);

  if (data.isDefault) {
    await prisma.shopAddress.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  return prisma.shopAddress.update({ where: { id }, data });
}

export async function remove(userId, id) {
  const address = await getById(userId, id);
  await prisma.shopAddress.delete({ where: { id } });

  if (address.isDefault) {
    const next = await prisma.shopAddress.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (next) await prisma.shopAddress.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  return address;
}
