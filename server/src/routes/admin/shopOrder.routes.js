import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as shopOrderController from '../../controllers/shopOrder.controller.js';
import * as shopShipmentController from '../../controllers/shopShipment.controller.js';
import {
  updateShopOrderSchema,
  listShopOrdersQuerySchema,
  updateShopOrderStatusSchema,
  assignCourierSchema,
} from '../../validators/shopOrder.validator.js';

const router = Router();

router.get('/', validate(listShopOrdersQuerySchema, 'query'), asyncHandler(shopOrderController.list));

router
  .route('/:id')
  .get(asyncHandler(shopOrderController.getById))
  .patch(validate(updateShopOrderSchema), asyncHandler(shopOrderController.update));

router.patch('/:id/status', validate(updateShopOrderStatusSchema), asyncHandler(shopOrderController.updateStatus));

router.post('/:orderId/shipment/push', asyncHandler(shopShipmentController.push));
router.post('/shipments/:shipmentId/assign', validate(assignCourierSchema), asyncHandler(shopShipmentController.assign));
router.post('/shipments/:shipmentId/refresh-tracking', asyncHandler(shopShipmentController.refreshTracking));

export default router;
