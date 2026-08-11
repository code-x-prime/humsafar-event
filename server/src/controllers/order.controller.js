import * as orderService from '../services/order.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await orderService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Orders fetched', meta });
};

export const getById = async (req, res) => {
  const order = await orderService.getById(req.params.id);
  return success(res, { data: order, message: 'Order fetched' });
};

export const create = async (req, res) => {
  const order = await orderService.create(req.body);
  req.auditContext = { entity: 'Order', entityId: order.id, after: order };
  return success(res, { status: 201, data: order, message: 'Order created successfully' });
};

export const update = async (req, res) => {
  const order = await orderService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Order', entityId: order.id, after: order };
  return success(res, { data: order, message: 'Order updated successfully' });
};

export const updateStatus = async (req, res) => {
  const order = await orderService.updateStatus(req.params.id, req.body.status, req.body.cancelReason);
  req.auditContext = { entity: 'Order', entityId: order.id, after: order };
  return success(res, { data: order, message: 'Order status updated successfully' });
};

export const remove = async (req, res) => {
  const order = await orderService.remove(req.params.id);
  req.auditContext = { entity: 'Order', entityId: order.id, before: order };
  return success(res, { message: 'Order cancelled successfully' });
};
