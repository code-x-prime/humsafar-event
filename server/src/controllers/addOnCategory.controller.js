import * as addOnCategoryService from '../services/addOnCategory.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const categories = await addOnCategoryService.list();
  return success(res, { data: categories, message: 'Add-on categories fetched' });
};

export const create = async (req, res) => {
  const category = await addOnCategoryService.create(req.body);
  req.auditContext = { entity: 'AddOnCategory', entityId: category.id, after: category };
  return success(res, { status: 201, data: category, message: 'Add-on category created successfully' });
};

export const update = async (req, res) => {
  const category = await addOnCategoryService.update(req.params.id, req.body);
  req.auditContext = { entity: 'AddOnCategory', entityId: category.id, after: category };
  return success(res, { data: category, message: 'Add-on category updated successfully' });
};

export const remove = async (req, res) => {
  const category = await addOnCategoryService.remove(req.params.id);
  req.auditContext = { entity: 'AddOnCategory', entityId: category.id, before: category };
  return success(res, { message: 'Add-on category deleted successfully' });
};

export const reorder = async (req, res) => {
  await addOnCategoryService.reorder(req.body.items);
  req.auditContext = { entity: 'AddOnCategory', entityId: 'bulk-reorder' };
  return success(res, { message: 'Add-on categories reordered successfully' });
};
