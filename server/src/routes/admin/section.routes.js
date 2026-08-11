import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as sectionController from '../../controllers/section.controller.js';
import {
  createSectionSchema,
  updateSectionSchema,
  toggleSectionSchema,
  reorderSectionsSchema,
  addProductSchema,
  reorderSectionProductsSchema,
  reorderHomeFeedSchema,
} from '../../validators/section.validator.js';

const router = Router();

router
  .route('/')
  .get(asyncHandler(sectionController.list))
  .post(validate(createSectionSchema), asyncHandler(sectionController.create));

router.patch('/reorder', validate(reorderSectionsSchema), asyncHandler(sectionController.reorder));
router.get('/home-feed-order', asyncHandler(sectionController.listHomeFeedOrder));
router.patch('/home-feed-order', validate(reorderHomeFeedSchema), asyncHandler(sectionController.reorderHomeFeed));

router
  .route('/:id')
  .get(asyncHandler(sectionController.getById))
  .patch(validate(updateSectionSchema), asyncHandler(sectionController.update))
  .delete(asyncHandler(sectionController.remove));

router.patch('/:id/toggle', validate(toggleSectionSchema), asyncHandler(sectionController.toggle));

router.post('/:id/products', validate(addProductSchema), asyncHandler(sectionController.addProduct));
router.patch('/:id/products/reorder', validate(reorderSectionProductsSchema), asyncHandler(sectionController.reorderProducts));
router.delete('/:id/products/:productId', asyncHandler(sectionController.removeProduct));

export default router;
