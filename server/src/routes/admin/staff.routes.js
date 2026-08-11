import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as staffController from '../../controllers/staff.controller.js';
import {
  createStaffSchema,
  updateStaffSchema,
  listStaffQuerySchema,
  toggleStaffSchema,
} from '../../validators/staff.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listStaffQuerySchema, 'query'), asyncHandler(staffController.list))
  .post(validate(createStaffSchema), asyncHandler(staffController.create));

router
  .route('/:id')
  .get(asyncHandler(staffController.getById))
  .patch(validate(updateStaffSchema), asyncHandler(staffController.update))
  .delete(asyncHandler(staffController.remove));

router.patch('/:id/toggle', validate(toggleStaffSchema), asyncHandler(staffController.toggle));

export default router;
