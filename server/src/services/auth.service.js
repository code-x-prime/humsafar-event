import { prisma } from '../config/db.js';
import { ADMIN_ROLES, ERROR_CODES } from '../config/constants.js';
import { comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { nowUTC } from '../utils/datetime.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function loginAdmin(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !ADMIN_ROLES.includes(user.role) || !user.isActive) {
    throw apiError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw apiError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: nowUTC() } });

  const payload = { sub: user.id, role: user.role };
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function refreshTokens(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw apiError(401, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || !user.isActive) {
    throw apiError(401, ERROR_CODES.INVALID_TOKEN, 'User no longer active');
  }

  const payload = { sub: user.id, role: user.role };
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
