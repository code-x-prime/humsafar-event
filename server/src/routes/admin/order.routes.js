import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as orderController from '../../controllers/order.controller.js';
import {
  createOrderSchema,
  updateOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
} from '../../validators/order.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listOrdersQuerySchema, 'query'), asyncHandler(orderController.list))
  .post(validate(createOrderSchema), asyncHandler(orderController.create));

router
  .route('/:id')
  .get(asyncHandler(orderController.getById))
  .patch(validate(updateOrderSchema), asyncHandler(orderController.update))
  .delete(asyncHandler(orderController.remove));

router.patch('/:id/status', validate(updateOrderStatusSchema), asyncHandler(orderController.updateStatus));

export default router;
