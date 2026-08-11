import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import * as publicReviewController from '../../controllers/publicReview.controller.js';
import { submitReviewSchema } from '../../validators/publicReview.validator.js';

const router = Router();

router.use(verifyJWT);

router.post('/', validate(submitReviewSchema), asyncHandler(publicReviewController.submit));
router.get('/reviewable', asyncHandler(publicReviewController.getReviewable));

export default router;
