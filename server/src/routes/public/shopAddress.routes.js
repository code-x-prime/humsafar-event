import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import * as shopAddressController from '../../controllers/shopAddress.controller.js';
import { createShopAddressSchema, updateShopAddressSchema } from '../../validators/shopAddress.validator.js';

const router = Router();

router.use(verifyJWT);

router
  .route('/')
  .get(asyncHandler(shopAddressController.list))
  .post(validate(createShopAddressSchema), asyncHandler(shopAddressController.create));

router
  .route('/:id')
  .patch(validate(updateShopAddressSchema), asyncHandler(shopAddressController.update))
  .delete(asyncHandler(shopAddressController.remove));

export default router;
