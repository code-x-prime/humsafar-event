import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as couponController from '../../controllers/coupon.controller.js';
import {
  createCouponSchema,
  updateCouponSchema,
  listCouponsQuerySchema,
  toggleCouponSchema,
} from '../../validators/coupon.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listCouponsQuerySchema, 'query'), asyncHandler(couponController.list))
  .post(validate(createCouponSchema), asyncHandler(couponController.create));

router
  .route('/:id')
  .get(asyncHandler(couponController.getById))
  .patch(validate(updateCouponSchema), asyncHandler(couponController.update))
  .delete(asyncHandler(couponController.remove));

router.patch('/:id/toggle', validate(toggleCouponSchema), asyncHandler(couponController.toggle));

export default router;
