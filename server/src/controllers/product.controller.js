import * as productService from '../services/product.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await productService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Products fetched', meta });
};

export const getById = async (req, res) => {
  const product = await productService.getById(req.params.id);
  return success(res, { data: product, message: 'Product fetched' });
};

export const create = async (req, res) => {
  const product = await productService.create(req.body);
  req.auditContext = { entity: 'Product', entityId: product.id, after: product };
  return success(res, { status: 201, data: product, message: 'Product created successfully' });
};

export const update = async (req, res) => {
  const product = await productService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Product', entityId: product.id, after: product };
  return success(res, { data: product, message: 'Product updated successfully' });
};

export const toggle = async (req, res) => {
  const product = await productService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'Product', entityId: product.id, after: product };
  return success(res, { data: product, message: 'Product updated successfully' });
};

export const reorder = async (req, res) => {
  await productService.reorder(req.body.items);
  req.auditContext = { entity: 'Product', entityId: 'bulk-reorder' };
  return success(res, { message: 'Products reordered successfully' });
};

export const remove = async (req, res) => {
  const product = await productService.remove(req.params.id);
  req.auditContext = { entity: 'Product', entityId: product.id, before: product };
  return success(res, { message: 'Product deleted successfully' });
};
