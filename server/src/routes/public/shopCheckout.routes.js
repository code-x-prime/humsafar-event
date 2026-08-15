import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import * as shopCheckoutController from '../../controllers/shopCheckout.controller.js';
import { createShopOrderSchema, verifyShopPaymentSchema, cancelPaidShopOrderSchema } from '../../validators/shopCheckout.validator.js';

const router = Router();

router.use(verifyJWT);

router.get('/preview', asyncHandler(shopCheckoutController.preview));
router.post('/orders', validate(createShopOrderSchema), asyncHandler(shopCheckoutController.createOrder));
router.get('/orders/:orderId', asyncHandler(shopCheckoutController.getOrder));
router.get('/my-orders', asyncHandler(shopCheckoutController.listMyOrders));
router.get('/my-orders/:orderId', asyncHandler(shopCheckoutController.getMyOrderDetail));
router.post('/orders/:orderId/verify', validate(verifyShopPaymentSchema), asyncHandler(shopCheckoutController.verifyPayment));
router.post('/orders/:orderId/cancel', asyncHandler(shopCheckoutController.cancelOrder));
router.post('/orders/:orderId/cancel-paid', validate(cancelPaidShopOrderSchema), asyncHandler(shopCheckoutController.cancelPaidOrder));

export default router;
