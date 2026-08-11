import * as staffService from '../services/staff.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await staffService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Staff fetched', meta });
};

export const getById = async (req, res) => {
  const staff = await staffService.getById(req.params.id);
  return success(res, { data: staff, message: 'Staff fetched' });
};

export const create = async (req, res) => {
  const staff = await staffService.create(req.body);
  req.auditContext = { entity: 'Staff', entityId: staff.id, after: staff };
  return success(res, { status: 201, data: staff, message: 'Staff created successfully' });
};

export const update = async (req, res) => {
  const staff = await staffService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Staff', entityId: staff.id, after: staff };
  return success(res, { data: staff, message: 'Staff updated successfully' });
};

export const toggle = async (req, res) => {
  const staff = await staffService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'Staff', entityId: staff.id, after: staff };
  return success(res, { data: staff, message: 'Staff updated successfully' });
};

export const remove = async (req, res) => {
  const staff = await staffService.remove(req.params.id);
  req.auditContext = { entity: 'Staff', entityId: staff.id, before: staff };
  return success(res, { message: 'Staff deactivated successfully' });
};
