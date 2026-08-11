import * as cityService from '../services/city.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await cityService.list(req.validatedQuery || req.query);
  return res.status(200).json({ success: true, data: items, message: 'Cities fetched', meta });
};

export const getById = async (req, res) => {
  const city = await cityService.getById(req.params.id);
  return success(res, { data: city, message: 'City fetched' });
};

export const create = async (req, res) => {
  const city = await cityService.create(req.body);
  req.auditContext = { entity: 'City', entityId: city.id, after: city };
  return success(res, { status: 201, data: city, message: 'City created successfully' });
};

export const update = async (req, res) => {
  const city = await cityService.update(req.params.id, req.body);
  req.auditContext = { entity: 'City', entityId: city.id, after: city };
  return success(res, { data: city, message: 'City updated successfully' });
};

export const toggle = async (req, res) => {
  const city = await cityService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'City', entityId: city.id, after: city };
  return success(res, { data: city, message: 'City updated successfully' });
};

export const reorder = async (req, res) => {
  await cityService.reorder(req.body.items);
  req.auditContext = { entity: 'City', entityId: 'bulk-reorder' };
  return success(res, { message: 'Cities reordered successfully' });
};

export const remove = async (req, res) => {
  const city = await cityService.remove(req.params.id);
  req.auditContext = { entity: 'City', entityId: city.id, before: city };
  return success(res, { message: 'City deleted successfully' });
};

export const stats = async (req, res) => {
  const data = await cityService.stats(req.params.id);
  return success(res, { data, message: 'City stats fetched' });
};
