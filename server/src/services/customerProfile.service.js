import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  if (!user) throw apiError(404, ERROR_CODES.NOT_FOUND, 'User not found');
  return user;
}

export async function updateProfile(userId, { name, email }) {
  return prisma.user.update({
    where: { id: userId },
    data: { name, email },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
}
