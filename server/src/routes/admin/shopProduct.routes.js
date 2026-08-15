import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as shopProductController from '../../controllers/shopProduct.controller.js';
import {
  createShopProductSchema,
  updateShopProductSchema,
  listShopProductsQuerySchema,
  toggleShopProductSchema,
  reorderShopProductsSchema,
} from '../../validators/shopProduct.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listShopProductsQuerySchema, 'query'), asyncHandler(shopProductController.list))
  .post(validate(createShopProductSchema), asyncHandler(shopProductController.create));

router.patch('/reorder', validate(reorderShopProductsSchema), asyncHandler(shopProductController.reorder));

router
  .route('/:id')
  .get(asyncHandler(shopProductController.getById))
  .patch(validate(updateShopProductSchema), asyncHandler(shopProductController.update))
  .delete(asyncHandler(shopProductController.remove));

router.patch('/:id/toggle', validate(toggleShopProductSchema), asyncHandler(shopProductController.toggle));

export default router;
