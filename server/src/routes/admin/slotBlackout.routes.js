import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as slotBlackoutController from '../../controllers/slotBlackout.controller.js';
import {
  createSlotBlackoutSchema,
  updateSlotBlackoutSchema,
  listSlotBlackoutsQuerySchema,
} from '../../validators/slotBlackout.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listSlotBlackoutsQuerySchema, 'query'), asyncHandler(slotBlackoutController.list))
  .post(validate(createSlotBlackoutSchema), asyncHandler(slotBlackoutController.create));

router
  .route('/:id')
  .get(asyncHandler(slotBlackoutController.getById))
  .patch(validate(updateSlotBlackoutSchema), asyncHandler(slotBlackoutController.update))
  .delete(asyncHandler(slotBlackoutController.remove));

export default router;
