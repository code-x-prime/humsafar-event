import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalAuth, verifyJWT } from '../../middlewares/auth.middleware.js';
import { reviewRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import * as publicShopReviewController from '../../controllers/publicShopReview.controller.js';
import { submitShopReviewSchema, openShopReviewSchema } from '../../validators/publicShopReview.validator.js';

const router = Router();

// Product-page review: open to guests too (optionalAuth only attaches the user
// when a valid token is sent). Must come before the verifyJWT wall below.
router.post('/open', reviewRateLimiter, optionalAuth, validate(openShopReviewSchema), asyncHandler(publicShopReviewController.submitOpen));

router.use(verifyJWT);

router.post('/', validate(submitShopReviewSchema), asyncHandler(publicShopReviewController.submit));
router.get('/reviewable', asyncHandler(publicShopReviewController.getReviewable));

export default router;
