import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { otpRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import { adminLogin, refresh } from '../../controllers/auth.controller.js';
import {
  registerHandler,
  resendRegistrationOtpHandler,
  verifyRegistrationHandler,
  loginHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from '../../controllers/otp.controller.js';

const router = Router();

router.post('/admin/login', asyncHandler(adminLogin));
router.post('/refresh', asyncHandler(refresh));

router.post('/register', otpRateLimiter, asyncHandler(registerHandler));
router.post('/register/resend', otpRateLimiter, asyncHandler(resendRegistrationOtpHandler));
router.post('/register/verify', otpRateLimiter, asyncHandler(verifyRegistrationHandler));
router.post('/login', otpRateLimiter, asyncHandler(loginHandler));
router.post('/forgot-password', otpRateLimiter, asyncHandler(forgotPasswordHandler));
router.post('/reset-password', otpRateLimiter, asyncHandler(resetPasswordHandler));

export default router;
