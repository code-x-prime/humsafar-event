import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as addOnController from '../../controllers/addon.controller.js';
import {
  createAddOnSchema,
  updateAddOnSchema,
  listAddOnsQuerySchema,
  toggleAddOnSchema,
  reorderAddOnsSchema,
} from '../../validators/addon.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listAddOnsQuerySchema, 'query'), asyncHandler(addOnController.list))
  .post(validate(createAddOnSchema), asyncHandler(addOnController.create));

router.patch('/reorder', validate(reorderAddOnsSchema), asyncHandler(addOnController.reorder));

router
  .route('/:id')
  .get(asyncHandler(addOnController.getById))
  .patch(validate(updateAddOnSchema), asyncHandler(addOnController.update))
  .delete(asyncHandler(addOnController.remove));

router.patch('/:id/toggle', validate(toggleAddOnSchema), asyncHandler(addOnController.toggle));

export default router;
