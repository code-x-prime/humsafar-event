import * as reviewService from '../services/review.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await reviewService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Reviews fetched', meta });
};

export const getById = async (req, res) => {
  const review = await reviewService.getById(req.params.id);
  return success(res, { data: review, message: 'Review fetched' });
};

export const create = async (req, res) => {
  const review = await reviewService.create(req.body);
  req.auditContext = { entity: 'Review', entityId: review.id, after: review };
  return success(res, { status: 201, data: review, message: 'Review created successfully' });
};

export const update = async (req, res) => {
  const review = await reviewService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Review', entityId: review.id, after: review };
  return success(res, { data: review, message: 'Review updated successfully' });
};

export const toggle = async (req, res) => {
  const review = await reviewService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'Review', entityId: review.id, after: review };
  return success(res, { data: review, message: 'Review updated successfully' });
};

export const remove = async (req, res) => {
  const review = await reviewService.remove(req.params.id);
  req.auditContext = { entity: 'Review', entityId: review.id, before: review };
  return success(res, { message: 'Review deleted successfully' });
};
