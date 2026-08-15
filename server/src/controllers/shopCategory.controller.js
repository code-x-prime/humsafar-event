import * as shopCategoryService from '../services/shopCategory.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await shopCategoryService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Shop categories fetched', meta });
};

export const getById = async (req, res) => {
  const category = await shopCategoryService.getById(req.params.id);
  return success(res, { data: category, message: 'Shop category fetched' });
};

export const create = async (req, res) => {
  const category = await shopCategoryService.create(req.body);
  req.auditContext = { entity: 'ShopCategory', entityId: category.id, after: category };
  return success(res, { status: 201, data: category, message: 'Shop category created successfully' });
};

export const update = async (req, res) => {
  const category = await shopCategoryService.update(req.params.id, req.body);
  req.auditContext = { entity: 'ShopCategory', entityId: category.id, after: category };
  return success(res, { data: category, message: 'Shop category updated successfully' });
};

export const toggle = async (req, res) => {
  const category = await shopCategoryService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'ShopCategory', entityId: category.id, after: category };
  return success(res, { data: category, message: 'Shop category updated successfully' });
};

export const reorder = async (req, res) => {
  await shopCategoryService.reorder(req.body.items);
  req.auditContext = { entity: 'ShopCategory', entityId: 'bulk-reorder' };
  return success(res, { message: 'Shop categories reordered successfully' });
};

export const remove = async (req, res) => {
  const category = await shopCategoryService.remove(req.params.id);
  req.auditContext = { entity: 'ShopCategory', entityId: category.id, before: category };
  return success(res, { message: 'Shop category deleted successfully' });
};
