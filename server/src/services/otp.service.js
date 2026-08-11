import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { ERROR_CODES, ROLES } from '../config/constants.js';
import { generateOtp, hashOtp, compareOtp } from '../utils/otp.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { nowIST, nowUTC } from '../utils/datetime.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { sendMail } from '../lib/email/index.js';

const OTP_TTL_SECONDS = 5 * 60;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function loginPayload(user) {
  const payload = { sub: user.id, role: user.role };
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function issueOtp(email, purpose) {
  const cooldownSince = nowIST().subtract(OTP_COOLDOWN_SECONDS, 'second').toDate();

  const recent = await prisma.otp.findFirst({
    where: { email, purpose, consumedAt: null, createdAt: { gte: cooldownSince } },
    orderBy: { createdAt: 'desc' },
  });

  if (recent) {
    throw apiError(429, ERROR_CODES.OTP_COOLDOWN, 'Please wait a minute before requesting another code');
  }

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = nowIST().add(OTP_TTL_SECONDS, 'second').toDate();

  await prisma.otp.create({ data: { email, codeHash, purpose, expiresAt } });

  sendMail({
    to: email,
    template: 'otp',
    subject: 'Your Humsafar Events verification code',
    data: { code, expiresInMinutes: OTP_TTL_SECONDS / 60 },
  }).catch((err) => logger.error({ err, email }, 'Failed to email OTP'));

  if (env.NODE_ENV !== 'production') {
    logger.info({ email, code }, 'OTP generated (dev mode)');
  }

  return { expiresIn: OTP_TTL_SECONDS };
}

async function consumeOtp(email, code, purpose) {
  const otp = await prisma.otp.findFirst({
    where: { email, purpose, consumedAt: null, expiresAt: { gt: nowUTC() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    throw apiError(400, ERROR_CODES.OTP_INVALID, 'This code has expired — request a new one and try again');
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw apiError(410, ERROR_CODES.OTP_MAX_ATTEMPTS, 'Too many incorrect attempts — request a new code');
  }

  const isValid = await compareOtp(code, otp.codeHash);
  if (!isValid) {
    await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw apiError(400, ERROR_CODES.OTP_INVALID, 'Incorrect code');
  }

  await prisma.otp.update({ where: { id: otp.id }, data: { consumedAt: nowUTC() } });
}

// POST /auth/register — creates the account (unverified) and sends the
// signup OTP. If someone re-registers the same email before verifying, we
// don't create a duplicate row — we just update the password and re-send a
// fresh code, so an abandoned signup from days ago can still be completed.
export async function register({ name, email, password, phone }) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing?.emailVerifiedAt) {
    throw apiError(409, ERROR_CODES.EMAIL_ALREADY_REGISTERED, 'An account with this email already exists — try logging in instead');
  }

  if (phone) {
    const phoneOwner = await prisma.user.findUnique({ where: { phone } });
    if (phoneOwner && phoneOwner.id !== existing?.id) {
      throw apiError(409, ERROR_CODES.VALIDATION_ERROR, 'This phone number is already in use by another account');
    }
  }

  const passwordHash = await hashPassword(password);

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash, phone: phone || existing.phone } });
  } else {
    await prisma.user.create({ data: { name, email, passwordHash, phone: phone || undefined, role: ROLES.CUSTOMER } });
  }

  const { expiresIn } = await issueOtp(email, 'SIGNUP');
  return { expiresIn };
}

// POST /auth/register/resend — re-sends the signup code. Works no matter how
// long ago the account was created (days, even) since verification state
// lives entirely on emailVerifiedAt, not on any OTP row's age.
export async function resendRegistrationOtp(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw apiError(404, ERROR_CODES.NOT_FOUND, 'No pending registration found for this email');
  }
  if (user.emailVerifiedAt) {
    throw apiError(409, ERROR_CODES.EMAIL_ALREADY_REGISTERED, 'This email is already verified — try logging in instead');
  }

  return issueOtp(email, 'SIGNUP');
}

// POST /auth/register/verify — confirms the signup code and logs the
// customer in immediately (no separate login step needed right after
// verifying), matching how most consumer apps handle first-time signup.
export async function verifyRegistration(email, code) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw apiError(404, ERROR_CODES.NOT_FOUND, 'No pending registration found for this email');
  }

  await consumeOtp(email, code, 'SIGNUP');

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: nowUTC(), lastLoginAt: nowUTC() },
  });

  return loginPayload(verifiedUser);
}

// POST /auth/login — email+password. Deliberately gives the same "check
// your email" message whether the account doesn't exist or the password is
// wrong, so a login attempt can't be used to enumerate registered emails.
export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !user.isActive) {
    throw apiError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw apiError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  if (!user.emailVerifiedAt) {
    throw apiError(403, ERROR_CODES.EMAIL_NOT_VERIFIED, 'Please verify your email first — we can resend the code');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: nowUTC() } });
  return loginPayload(user);
}

// POST /auth/forgot-password — sends a reset code if the email belongs to a
// verified account. Always reports success either way (never reveals whether
// an email is registered) — the OTP simply won't arrive for unknown emails.
export async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !user.emailVerifiedAt) {
    return { expiresIn: OTP_TTL_SECONDS };
  }

  return issueOtp(email, 'PASSWORD_RESET');
}

// POST /auth/reset-password — confirms the reset code and sets a new
// password. Logs the customer in immediately afterward, same as signup
// verification, so they don't have to re-enter the new password right away.
export async function resetPassword(email, code, newPassword) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw apiError(404, ERROR_CODES.NOT_FOUND, 'No account found for this email');
  }

  await consumeOtp(email, code, 'PASSWORD_RESET');

  const passwordHash = await hashPassword(newPassword);
  const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return loginPayload(updatedUser);
}
