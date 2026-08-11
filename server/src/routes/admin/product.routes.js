import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as productController from '../../controllers/product.controller.js';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  toggleProductSchema,
  reorderProductsSchema,
} from '../../validators/product.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listProductsQuerySchema, 'query'), asyncHandler(productController.list))
  .post(validate(createProductSchema), asyncHandler(productController.create));

router.patch('/reorder', validate(reorderProductsSchema), asyncHandler(productController.reorder));

router
  .route('/:id')
  .get(asyncHandler(productController.getById))
  .patch(validate(updateProductSchema), asyncHandler(productController.update))
  .delete(asyncHandler(productController.remove));

router.patch('/:id/toggle', validate(toggleProductSchema), asyncHandler(productController.toggle));

export default router;
