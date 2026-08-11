import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as variantPresetController from '../../controllers/variantPreset.controller.js';
import { createVariantPresetSchema, updateVariantPresetSchema } from '../../validators/variantPreset.validator.js';

const router = Router();

router
  .route('/')
  .get(asyncHandler(variantPresetController.list))
  .post(validate(createVariantPresetSchema), asyncHandler(variantPresetController.create));

router
  .route('/:id')
  .get(asyncHandler(variantPresetController.getById))
  .patch(validate(updateVariantPresetSchema), asyncHandler(variantPresetController.update))
  .delete(asyncHandler(variantPresetController.remove));

export default router;
