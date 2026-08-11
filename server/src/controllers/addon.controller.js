import * as addOnService from '../services/addon.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await addOnService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Add-ons fetched', meta });
};

export const getById = async (req, res) => {
  const addOn = await addOnService.getById(req.params.id);
  return success(res, { data: addOn, message: 'Add-on fetched' });
};

export const create = async (req, res) => {
  const addOn = await addOnService.create(req.body);
  req.auditContext = { entity: 'AddOn', entityId: addOn.id, after: addOn };
  return success(res, { status: 201, data: addOn, message: 'Add-on created successfully' });
};

export const update = async (req, res) => {
  const addOn = await addOnService.update(req.params.id, req.body);
  req.auditContext = { entity: 'AddOn', entityId: addOn.id, after: addOn };
  return success(res, { data: addOn, message: 'Add-on updated successfully' });
};

export const toggle = async (req, res) => {
  const addOn = await addOnService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'AddOn', entityId: addOn.id, after: addOn };
  return success(res, { data: addOn, message: 'Add-on updated successfully' });
};

export const remove = async (req, res) => {
  const addOn = await addOnService.remove(req.params.id);
  req.auditContext = { entity: 'AddOn', entityId: addOn.id, before: addOn };
  return success(res, { message: 'Add-on deleted successfully' });
};

export const reorder = async (req, res) => {
  await addOnService.reorder(req.body.items);
  req.auditContext = { entity: 'AddOn', entityId: 'bulk-reorder' };
  return success(res, { message: 'Add-ons reordered successfully' });
};
