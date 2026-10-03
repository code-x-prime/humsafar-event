import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalAuth, verifyJWT } from '../../middlewares/auth.middleware.js';
import { reviewRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import * as publicReviewController from '../../controllers/publicReview.controller.js';
import { submitReviewSchema, openReviewSchema } from '../../validators/publicReview.validator.js';

const router = Router();

// Product-page review: open to guests too (optionalAuth only attaches the user
// when a valid token is sent). Must come before the verifyJWT wall below.
router.post('/open', reviewRateLimiter, optionalAuth, validate(openReviewSchema), asyncHandler(publicReviewController.submitOpen));

router.use(verifyJWT);

router.post('/', validate(submitReviewSchema), asyncHandler(publicReviewController.submit));
router.get('/reviewable', asyncHandler(publicReviewController.getReviewable));

export default router;
