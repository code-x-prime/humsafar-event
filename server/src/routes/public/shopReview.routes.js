import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import * as publicShopReviewController from '../../controllers/publicShopReview.controller.js';
import { submitShopReviewSchema } from '../../validators/publicShopReview.validator.js';

const router = Router();

router.use(verifyJWT);

router.post('/', validate(submitShopReviewSchema), asyncHandler(publicShopReviewController.submit));
router.get('/reviewable', asyncHandler(publicShopReviewController.getReviewable));

export default router;
