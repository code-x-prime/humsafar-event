import * as shopOrderService from '../services/shopOrder.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await shopOrderService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Shop orders fetched', meta });
};

export const getById = async (req, res) => {
  const order = await shopOrderService.getById(req.params.id);
  return success(res, { data: order, message: 'Shop order fetched' });
};

export const update = async (req, res) => {
  const order = await shopOrderService.update(req.params.id, req.body);
  req.auditContext = { entity: 'ShopOrder', entityId: order.id, after: order };
  return success(res, { data: order, message: 'Shop order updated successfully' });
};

export const updateStatus = async (req, res) => {
  const order = await shopOrderService.updateStatus(req.params.id, req.body.status, req.body.cancelReason);
  req.auditContext = { entity: 'ShopOrder', entityId: order.id, after: order };
  return success(res, { data: order, message: 'Shop order status updated successfully' });
};
