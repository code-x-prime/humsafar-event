import * as paymentService from '../services/payment.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await paymentService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Payments fetched', meta });
};

export const getById = async (req, res) => {
  const payment = await paymentService.getById(req.params.id);
  return success(res, { data: payment, message: 'Payment fetched' });
};

export const create = async (req, res) => {
  const payment = await paymentService.create(req.body);
  req.auditContext = { entity: 'Payment', entityId: payment.id, after: payment };
  return success(res, { status: 201, data: payment, message: 'Payment created successfully' });
};

export const update = async (req, res) => {
  const payment = await paymentService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Payment', entityId: payment.id, after: payment };
  return success(res, { data: payment, message: 'Payment updated successfully' });
};

export const refund = async (req, res) => {
  const payment = await paymentService.refund(req.params.id, req.body.refundAmount, req.body.refundId);
  req.auditContext = { entity: 'Payment', entityId: payment.id, after: payment };
  return success(res, { data: payment, message: 'Payment refunded successfully' });
};

export const remove = async (req, res) => {
  const payment = await paymentService.remove(req.params.id);
  req.auditContext = { entity: 'Payment', entityId: payment.id, before: payment };
  return success(res, { message: 'Payment deleted successfully' });
};
