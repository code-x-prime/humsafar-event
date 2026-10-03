import rateLimit from 'express-rate-limit';
import { RATE_LIMITS, ERROR_CODES } from '../config/constants.js';

export const globalRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.GLOBAL_WINDOW_MS,
  limit: RATE_LIMITS.GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

// The API sits behind nginx, which forwards the visitor's address in
// X-Real-IP (req.ip would be the proxy's 127.0.0.1 for everyone, so the limit
// would be shared site-wide instead of per visitor).
export const reviewRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.REVIEW_WINDOW_MS,
  limit: RATE_LIMITS.REVIEW_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.headers['x-real-ip'] || req.ip),
  validate: false,
  message: {
    success: false,
    code: ERROR_CODES.RATE_LIMITED,
    message: 'You have submitted several reviews recently — please try again in a while.',
    errors: [],
  },
});

export const reviewUploadRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.REVIEW_WINDOW_MS,
  limit: RATE_LIMITS.REVIEW_UPLOAD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.headers['x-real-ip'] || req.ip),
  validate: false,
  message: {
    success: false,
    code: ERROR_CODES.RATE_LIMITED,
    message: 'Too many photos uploaded recently — please try again in a while.',
    errors: [],
  },
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
