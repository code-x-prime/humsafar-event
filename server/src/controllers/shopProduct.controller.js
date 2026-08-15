import * as shopProductService from '../services/shopProduct.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await shopProductService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Shop products fetched', meta });
};

export const getById = async (req, res) => {
  const product = await shopProductService.getById(req.params.id);
  return success(res, { data: product, message: 'Shop product fetched' });
};

export const create = async (req, res) => {
  const product = await shopProductService.create(req.body);
  req.auditContext = { entity: 'ShopProduct', entityId: product.id, after: product };
  return success(res, { status: 201, data: product, message: 'Shop product created successfully' });
};

export const update = async (req, res) => {
  const product = await shopProductService.update(req.params.id, req.body);
  req.auditContext = { entity: 'ShopProduct', entityId: product.id, after: product };
  return success(res, { data: product, message: 'Shop product updated successfully' });
};

export const toggle = async (req, res) => {
  const product = await shopProductService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'ShopProduct', entityId: product.id, after: product };
  return success(res, { data: product, message: 'Shop product updated successfully' });
};

export const reorder = async (req, res) => {
  await shopProductService.reorder(req.body.items);
  req.auditContext = { entity: 'ShopProduct', entityId: 'bulk-reorder' };
  return success(res, { message: 'Shop products reordered successfully' });
};

export const remove = async (req, res) => {
  const product = await shopProductService.remove(req.params.id);
  req.auditContext = { entity: 'ShopProduct', entityId: product.id, before: product };
  return success(res, { message: 'Shop product deleted successfully' });
};
