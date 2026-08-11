import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as reviewController from '../../controllers/review.controller.js';
import {
  createReviewSchema,
  updateReviewSchema,
  listReviewsQuerySchema,
  toggleReviewSchema,
} from '../../validators/review.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listReviewsQuerySchema, 'query'), asyncHandler(reviewController.list))
  .post(validate(createReviewSchema), asyncHandler(reviewController.create));

router
  .route('/:id')
  .get(asyncHandler(reviewController.getById))
  .patch(validate(updateReviewSchema), asyncHandler(reviewController.update))
  .delete(asyncHandler(reviewController.remove));

router.patch('/:id/toggle', validate(toggleReviewSchema), asyncHandler(reviewController.toggle));

export default router;
