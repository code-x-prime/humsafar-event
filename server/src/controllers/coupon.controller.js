import * as couponService from '../services/coupon.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await couponService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Coupons fetched', meta });
};

export const getById = async (req, res) => {
  const coupon = await couponService.getById(req.params.id);
  return success(res, { data: coupon, message: 'Coupon fetched' });
};

export const create = async (req, res) => {
  const coupon = await couponService.create(req.body);
  req.auditContext = { entity: 'Coupon', entityId: coupon.code, after: coupon };
  return success(res, { status: 201, data: coupon, message: 'Coupon created successfully' });
};

export const update = async (req, res) => {
  const coupon = await couponService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Coupon', entityId: coupon.code, after: coupon };
  return success(res, { data: coupon, message: 'Coupon updated successfully' });
};

export const toggle = async (req, res) => {
  const coupon = await couponService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'Coupon', entityId: coupon.code, after: coupon };
  return success(res, { data: coupon, message: 'Coupon updated successfully' });
};

export const remove = async (req, res) => {
  const coupon = await couponService.remove(req.params.id);
  req.auditContext = { entity: 'Coupon', entityId: coupon.code, before: coupon };
  return success(res, { message: 'Coupon deleted successfully' });
};
