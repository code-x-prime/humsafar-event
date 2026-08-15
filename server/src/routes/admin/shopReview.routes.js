import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as shopReviewController from '../../controllers/shopReview.controller.js';
import { updateShopReviewSchema, listShopReviewsQuerySchema, toggleShopReviewSchema } from '../../validators/shopReview.validator.js';

const router = Router();

router.get('/', validate(listShopReviewsQuerySchema, 'query'), asyncHandler(shopReviewController.list));

router
  .route('/:id')
  .get(asyncHandler(shopReviewController.getById))
  .patch(validate(updateShopReviewSchema), asyncHandler(shopReviewController.update))
  .delete(asyncHandler(shopReviewController.remove));

router.patch('/:id/toggle', validate(toggleShopReviewSchema), asyncHandler(shopReviewController.toggle));

export default router;
