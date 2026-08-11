import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as slotController from '../../controllers/slot.controller.js';
import {
  createSlotSchema,
  updateSlotSchema,
  listSlotsQuerySchema,
  toggleSlotSchema,
  reorderSlotsSchema,
} from '../../validators/slot.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listSlotsQuerySchema, 'query'), asyncHandler(slotController.list))
  .post(validate(createSlotSchema), asyncHandler(slotController.create));

router.patch('/reorder', validate(reorderSlotsSchema), asyncHandler(slotController.reorder));

router
  .route('/:id')
  .get(asyncHandler(slotController.getById))
  .patch(validate(updateSlotSchema), asyncHandler(slotController.update))
  .delete(asyncHandler(slotController.remove));

router.patch('/:id/toggle', validate(toggleSlotSchema), asyncHandler(slotController.toggle));

export default router;
