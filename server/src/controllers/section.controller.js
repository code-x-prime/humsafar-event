import * as sectionService from '../services/section.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const sections = await sectionService.list();
  return success(res, { data: sections, message: 'Sections fetched' });
};

export const getById = async (req, res) => {
  const section = await sectionService.getById(req.params.id);
  return success(res, { data: section, message: 'Section fetched' });
};

export const create = async (req, res) => {
  const section = await sectionService.create(req.body);
  req.auditContext = { entity: 'ProductSection', entityId: section.id, after: section };
  return success(res, { status: 201, data: section, message: 'Section created successfully' });
};

export const update = async (req, res) => {
  const section = await sectionService.update(req.params.id, req.body);
  req.auditContext = { entity: 'ProductSection', entityId: section.id, after: section };
  return success(res, { data: section, message: 'Section updated successfully' });
};

export const toggle = async (req, res) => {
  const section = await sectionService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'ProductSection', entityId: section.id, after: section };
  return success(res, { data: section, message: 'Section updated successfully' });
};

export const reorder = async (req, res) => {
  await sectionService.reorder(req.body.items);
  req.auditContext = { entity: 'ProductSection', entityId: 'bulk-reorder' };
  return success(res, { message: 'Sections reordered successfully' });
};

export const remove = async (req, res) => {
  const section = await sectionService.remove(req.params.id);
  req.auditContext = { entity: 'ProductSection', entityId: section.id, before: section };
  return success(res, { message: 'Section deleted successfully' });
};

export const addProduct = async (req, res) => {
  const item = await sectionService.addProduct(req.params.id, req.body.productId);
  return success(res, { status: 201, data: item, message: 'Product added to section' });
};

export const removeProduct = async (req, res) => {
  await sectionService.removeProduct(req.params.id, req.params.productId);
  return success(res, { message: 'Product removed from section' });
};

export const reorderProducts = async (req, res) => {
  await sectionService.reorderProducts(req.params.id, req.body.items);
  return success(res, { message: 'Section products reordered' });
};

export const listHomeFeedOrder = async (req, res) => {
  const rows = await sectionService.listCombinedForOrdering();
  return success(res, { data: rows, message: 'Home feed order fetched' });
};

export const reorderHomeFeed = async (req, res) => {
  await sectionService.reorderHomeFeed(req.body.items);
  req.auditContext = { entity: 'HomeFeed', entityId: 'bulk-reorder' };
  return success(res, { message: 'Home feed reordered successfully' });
};
