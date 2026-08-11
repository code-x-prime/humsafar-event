import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as addOnCategoryController from '../../controllers/addOnCategory.controller.js';
import {
  createAddOnCategorySchema,
  updateAddOnCategorySchema,
  reorderAddOnsSchema,
} from '../../validators/addon.validator.js';

const router = Router();

router
  .route('/')
  .get(asyncHandler(addOnCategoryController.list))
  .post(validate(createAddOnCategorySchema), asyncHandler(addOnCategoryController.create));

router.patch('/reorder', validate(reorderAddOnsSchema), asyncHandler(addOnCategoryController.reorder));

router
  .route('/:id')
  .patch(validate(updateAddOnCategorySchema), asyncHandler(addOnCategoryController.update))
  .delete(asyncHandler(addOnCategoryController.remove));

export default router;
