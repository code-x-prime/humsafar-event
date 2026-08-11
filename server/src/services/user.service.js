import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ROLES, ERROR_CODES } from '../config/constants.js';
import { hashPassword } from '../utils/password.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = {
    ...buildWhere(query, { searchFields: ['name', 'email', 'phone'], filterFields: ['isActive'] }),
    role: ROLES.CUSTOMER,
  };
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy, skip, take, select: SELECT }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const user = await prisma.user.findFirst({ where: { id, role: ROLES.CUSTOMER }, select: SELECT });
  if (!user) throw apiError(404, ERROR_CODES.NOT_FOUND, 'User not found');
  return user;
}

export async function create(data) {
  return prisma.user.create({ data: { ...data, role: ROLES.CUSTOMER }, select: SELECT });
}

export async function update(id, data) {
  await getById(id);
  return prisma.user.update({ where: { id }, data, select: SELECT });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.user.update({ where: { id }, data: { [field]: value }, select: SELECT });
}

export async function remove(id) {
  const user = await getById(id);
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  return user;
}

// Admin-triggered resend of the signup verification code — same OTP issuance
// path a customer would trigger themselves via "Resend code", just started
// from the admin panel for a customer who can't get back into their own flow.
export async function resendVerification(id) {
  const user = await getById(id);
  if (!user.email) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This user has no email on file');
  }
  if (user.emailVerifiedAt) {
    throw apiError(409, ERROR_CODES.EMAIL_ALREADY_REGISTERED, 'This user is already verified');
  }

  const { resendRegistrationOtp } = await import('./otp.service.js');
  return resendRegistrationOtp(user.email);
}

// Admin-triggered password reset — generates a new random password, sets it
// immediately (no separate "reset link" flow needed), and emails it to the
// customer so an admin can help someone locked out without ever seeing or
// choosing their password themselves.
export async function resetPassword(id) {
  const user = await getById(id);
  if (!user.email) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This user has no email on file — cannot send a new password');
  }

  const newPassword = crypto.randomBytes(9).toString('base64url'); // 12-char random password
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  sendMail({
    to: user.email,
    template: 'password-reset',
    subject: 'Your Humsafar Events password has been reset',
    data: { customerName: user.name || 'Customer', newPassword },
  }).catch((err) => logger.error({ err, userId: id }, 'Failed to email password reset'));

  return { emailed: true };
}

export async function reactivate(id) {
  await getById(id);
  return prisma.user.update({ where: { id }, data: { isActive: true }, select: SELECT });
}
