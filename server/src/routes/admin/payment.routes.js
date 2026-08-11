import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as paymentController from '../../controllers/payment.controller.js';
import {
  createPaymentSchema,
  updatePaymentSchema,
  listPaymentsQuerySchema,
  refundPaymentSchema,
} from '../../validators/payment.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listPaymentsQuerySchema, 'query'), asyncHandler(paymentController.list))
  .post(validate(createPaymentSchema), asyncHandler(paymentController.create));

router
  .route('/:id')
  .get(asyncHandler(paymentController.getById))
  .patch(validate(updatePaymentSchema), asyncHandler(paymentController.update))
  .delete(asyncHandler(paymentController.remove));

router.patch('/:id/refund', validate(refundPaymentSchema), asyncHandler(paymentController.refund));

export default router;
