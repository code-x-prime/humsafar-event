import * as categoryService from '../services/category.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await categoryService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Categories fetched', meta });
};

export const getById = async (req, res) => {
  const category = await categoryService.getById(req.params.id);
  return success(res, { data: category, message: 'Category fetched' });
};

export const create = async (req, res) => {
  const category = await categoryService.create(req.body);
  req.auditContext = { entity: 'Category', entityId: category.id, after: category };
  return success(res, { status: 201, data: category, message: 'Category created successfully' });
};

export const update = async (req, res) => {
  const category = await categoryService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Category', entityId: category.id, after: category };
  return success(res, { data: category, message: 'Category updated successfully' });
};

export const toggle = async (req, res) => {
  const category = await categoryService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'Category', entityId: category.id, after: category };
  return success(res, { data: category, message: 'Category updated successfully' });
};

export const reorder = async (req, res) => {
  await categoryService.reorder(req.body.items);
  req.auditContext = { entity: 'Category', entityId: 'bulk-reorder' };
  return success(res, { message: 'Categories reordered successfully' });
};

export const remove = async (req, res) => {
  const category = await categoryService.remove(req.params.id);
  req.auditContext = { entity: 'Category', entityId: category.id, before: category };
  return success(res, { message: 'Category deleted successfully' });
};
