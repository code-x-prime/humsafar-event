import rateLimit from 'express-rate-limit';
import { RATE_LIMITS, ERROR_CODES } from '../config/constants.js';

export const globalRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.GLOBAL_WINDOW_MS,
  limit: RATE_LIMITS.GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.OTP_WINDOW_MS,
  limit: RATE_LIMITS.OTP_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: ERROR_CODES.RATE_LIMITED,
    message: 'Too many OTP requests, try again later',
    errors: [],
  },
});
