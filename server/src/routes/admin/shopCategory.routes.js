import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as shopCategoryController from '../../controllers/shopCategory.controller.js';
import {
  createShopCategorySchema,
  updateShopCategorySchema,
  toggleShopCategorySchema,
  reorderShopCategoriesSchema,
} from '../../validators/shopCategory.validator.js';

const router = Router();

router
  .route('/')
  .get(asyncHandler(shopCategoryController.list))
  .post(validate(createShopCategorySchema), asyncHandler(shopCategoryController.create));

router.patch('/reorder', validate(reorderShopCategoriesSchema), asyncHandler(shopCategoryController.reorder));

router
  .route('/:id')
  .get(asyncHandler(shopCategoryController.getById))
  .patch(validate(updateShopCategorySchema), asyncHandler(shopCategoryController.update))
  .delete(asyncHandler(shopCategoryController.remove));

router.patch('/:id/toggle', validate(toggleShopCategorySchema), asyncHandler(shopCategoryController.toggle));

export default router;
