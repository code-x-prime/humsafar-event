import * as otpService from '../services/otp.service.js';
import { success, error } from '../utils/apiResponse.js';
import { setRefreshCookie } from '../utils/cookies.js';
import { ERROR_CODES } from '../config/constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_CODE_RE = /^\d{6}$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

const PHONE_RE = /^[6-9]\d{9}$/;

export async function registerHandler(req, res) {
  const { name, email, password, phone } = req.body || {};

  if (!isValidEmail(email)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter a valid email address' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Password must be at least 6 characters' });
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter your name' });
  }
  if (phone && !PHONE_RE.test(phone)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter a valid 10-digit phone number' });
  }

  const { expiresIn } = await otpService.register({ name: name.trim(), email, password, phone: phone || undefined });
  return success(res, { data: { expiresIn }, message: 'Verification code sent to your email' });
}

export async function resendRegistrationOtpHandler(req, res) {
  const { email } = req.body || {};

  if (!isValidEmail(email)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter a valid email address' });
  }

  const { expiresIn } = await otpService.resendRegistrationOtp(email);
  return success(res, { data: { expiresIn }, message: 'Verification code sent to your email' });
}

export async function verifyRegistrationHandler(req, res) {
  const { email, code } = req.body || {};

  if (!isValidEmail(email)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter a valid email address' });
  }
  if (typeof code !== 'string' || !OTP_CODE_RE.test(code)) {
    return error(res, { status: 422, code: ERROR_CODES.INVALID_OTP_FORMAT, message: 'Code must be 6 digits' });
  }

  const { user, accessToken, refreshToken } = await otpService.verifyRegistration(email, code);

  setRefreshCookie(res, refreshToken);
  return success(res, { data: { user, accessToken }, message: 'Email verified — you are now logged in' });
}

export async function loginHandler(req, res) {
  const { email, password } = req.body || {};

  if (!isValidEmail(email)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter a valid email address' });
  }
  if (typeof password !== 'string' || password.length === 0) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter your password' });
  }

  const { user, accessToken, refreshToken } = await otpService.login(email, password);

  setRefreshCookie(res, refreshToken);
  return success(res, { data: { user, accessToken }, message: 'Logged in' });
}

export async function forgotPasswordHandler(req, res) {
  const { email } = req.body || {};

  if (!isValidEmail(email)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter a valid email address' });
  }

  const { expiresIn } = await otpService.forgotPassword(email);
  return success(res, { data: { expiresIn }, message: 'If an account exists for this email, a reset code has been sent' });
}

export async function resetPasswordHandler(req, res) {
  const { email, code, newPassword } = req.body || {};

  if (!isValidEmail(email)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter a valid email address' });
  }
  if (typeof code !== 'string' || !OTP_CODE_RE.test(code)) {
    return error(res, { status: 422, code: ERROR_CODES.INVALID_OTP_FORMAT, message: 'Code must be 6 digits' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Password must be at least 6 characters' });
  }

  const { user, accessToken, refreshToken } = await otpService.resetPassword(email, code, newPassword);

  setRefreshCookie(res, refreshToken);
  return success(res, { data: { user, accessToken }, message: 'Password reset — you are now logged in' });
}
