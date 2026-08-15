import * as shopShipmentService from '../services/shopShipment.service.js';
import { success } from '../utils/apiResponse.js';

// POST /admin/shop-orders/:orderId/shipment/push — pushes a confirmed order
// to Shiprocket (creates it there). Safe to re-call if it previously failed.
export const push = async (req, res) => {
  const shipment = await shopShipmentService.pushOrderToShiprocket(req.params.orderId);
  req.auditContext = { entity: 'ShopShipment', entityId: shipment.id, after: shipment };
  return success(res, { data: shipment, message: 'Order pushed to Shiprocket' });
};

// POST /admin/shop-orders/shipments/:shipmentId/assign — manually assign a
// courier + AWB (used for MANUAL-mode orders, or to retry a failed auto-assign).
export const assign = async (req, res) => {
  const shipment = await shopShipmentService.assignCourierAndNotify(req.params.shipmentId, req.body.courierId);
  req.auditContext = { entity: 'ShopShipment', entityId: shipment.id, after: shipment };
  return success(res, { data: shipment, message: 'Courier assigned' });
};

export const refreshTracking = async (req, res) => {
  const shipment = await shopShipmentService.refreshTracking(req.params.shipmentId);
  return success(res, { data: shipment, message: 'Tracking updated' });
};
