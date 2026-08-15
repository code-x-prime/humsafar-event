import * as shopReviewService from '../services/shopReview.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await shopReviewService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Shop reviews fetched', meta });
};

export const getById = async (req, res) => {
  const review = await shopReviewService.getById(req.params.id);
  return success(res, { data: review, message: 'Shop review fetched' });
};

export const update = async (req, res) => {
  const review = await shopReviewService.update(req.params.id, req.body);
  req.auditContext = { entity: 'ShopProductReview', entityId: review.id, after: review };
  return success(res, { data: review, message: 'Shop review updated successfully' });
};

export const toggle = async (req, res) => {
  const review = await shopReviewService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'ShopProductReview', entityId: review.id, after: review };
  return success(res, { data: review, message: 'Shop review updated successfully' });
};

export const remove = async (req, res) => {
  const review = await shopReviewService.remove(req.params.id);
  req.auditContext = { entity: 'ShopProductReview', entityId: review.id, before: review };
  return success(res, { message: 'Shop review deleted successfully' });
};
