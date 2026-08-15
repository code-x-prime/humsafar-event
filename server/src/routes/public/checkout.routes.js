import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import * as checkoutController from '../../controllers/checkout.controller.js';
import { previewOrderSchema, createOrderSchema, verifyPaymentSchema, cancelPaidOrderSchema } from '../../validators/checkout.validator.js';

const router = Router();

router.use(verifyJWT);

router.get('/preview', validate(previewOrderSchema, 'query'), asyncHandler(checkoutController.preview));
router.get('/eligible-coupons', asyncHandler(checkoutController.eligibleCoupons));
router.post('/orders', validate(createOrderSchema), asyncHandler(checkoutController.createOrder));
router.get('/orders/:orderId', asyncHandler(checkoutController.getOrder));
router.get('/my-orders', asyncHandler(checkoutController.listMyOrders));
router.get('/my-orders/:orderId', asyncHandler(checkoutController.getMyOrderDetail));
router.post('/orders/:orderId/verify', validate(verifyPaymentSchema), asyncHandler(checkoutController.verifyPayment));
router.post('/orders/:orderId/cancel', asyncHandler(checkoutController.cancelOrder));
router.post('/orders/:orderId/cancel-paid', validate(cancelPaidOrderSchema), asyncHandler(checkoutController.cancelPaidOrder));

export default router;
