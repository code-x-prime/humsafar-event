import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import * as addressController from '../../controllers/address.controller.js';
import { createAddressSchema, updateAddressSchema } from '../../validators/address.validator.js';

const router = Router();

// Addresses require a logged-in customer — guests are asked to log in before
// checkout reaches this step (matches the standing "guest cart, logged-in
// checkout" flow already used for orders).
router.use(verifyJWT);

router
  .route('/')
  .get(asyncHandler(addressController.list))
  .post(validate(createAddressSchema), asyncHandler(addressController.create));

router
  .route('/:id')
  .patch(validate(updateAddressSchema), asyncHandler(addressController.update))
  .delete(asyncHandler(addressController.remove));

export default router;
