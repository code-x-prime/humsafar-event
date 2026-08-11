import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as userController from '../../controllers/user.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  toggleUserSchema,
} from '../../validators/user.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listUsersQuerySchema, 'query'), asyncHandler(userController.list))
  .post(validate(createUserSchema), asyncHandler(userController.create));

router
  .route('/:id')
  .get(asyncHandler(userController.getById))
  .patch(validate(updateUserSchema), asyncHandler(userController.update))
  .delete(asyncHandler(userController.remove));

router.patch('/:id/toggle', validate(toggleUserSchema), asyncHandler(userController.toggle));
router.post('/:id/resend-verification', asyncHandler(userController.resendVerification));
router.post('/:id/reset-password', asyncHandler(userController.resetPassword));
router.post('/:id/reactivate', asyncHandler(userController.reactivate));

export default router;
