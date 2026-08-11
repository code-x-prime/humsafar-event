import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import * as customerProfileController from '../../controllers/customerProfile.controller.js';
import { updateProfileSchema } from '../../validators/customerProfile.validator.js';

const router = Router();

router.use(verifyJWT);

router
  .route('/')
  .get(asyncHandler(customerProfileController.getProfile))
  .patch(validate(updateProfileSchema), asyncHandler(customerProfileController.updateProfile));

export default router;
