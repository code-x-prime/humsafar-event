import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as categoryController from '../../controllers/category.controller.js';
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema,
  toggleCategorySchema,
  reorderCategoriesSchema,
} from '../../validators/category.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listCategoriesQuerySchema, 'query'), asyncHandler(categoryController.list))
  .post(validate(createCategorySchema), asyncHandler(categoryController.create));

router.patch('/reorder', validate(reorderCategoriesSchema), asyncHandler(categoryController.reorder));

router
  .route('/:id')
  .get(asyncHandler(categoryController.getById))
  .patch(validate(updateCategorySchema), asyncHandler(categoryController.update))
  .delete(asyncHandler(categoryController.remove));

router.patch('/:id/toggle', validate(toggleCategorySchema), asyncHandler(categoryController.toggle));

export default router;
