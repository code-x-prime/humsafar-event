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
// Must stay above '/:id', which would otherwise swallow 'counts' as an order id.
router.get('/counts', asyncHandler(shopOrderController.counts));

router
  .route('/:id')
  .get(asyncHandler(shopOrderController.getById))
  .patch(validate(updateShopOrderSchema), asyncHandler(shopOrderController.update));

router.get('/:id/invoice', asyncHandler(shopOrderController.invoice));
router.patch('/:id/status', validate(updateShopOrderStatusSchema), asyncHandler(shopOrderController.updateStatus));

router.post('/:orderId/shipment/push', asyncHandler(shopShipmentController.push));
router.post('/shipments/:shipmentId/assign', validate(assignCourierSchema), asyncHandler(shopShipmentController.assign));
router.post('/shipments/:shipmentId/label', asyncHandler(shopShipmentController.label));
router.post('/shipments/:shipmentId/pickup', asyncHandler(shopShipmentController.pickup));
router.post('/shipments/:shipmentId/refresh-tracking', asyncHandler(shopShipmentController.refreshTracking));

export default router;
