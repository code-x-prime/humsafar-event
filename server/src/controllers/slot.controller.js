import * as slotService from '../services/slot.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await slotService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Time slots fetched', meta });
};

export const getById = async (req, res) => {
  const slot = await slotService.getById(req.params.id);
  return success(res, { data: slot, message: 'Time slot fetched' });
};

export const create = async (req, res) => {
  const slot = await slotService.create(req.body);
  req.auditContext = { entity: 'TimeSlot', entityId: slot.id, after: slot };
  return success(res, { status: 201, data: slot, message: 'Time slot created successfully' });
};

export const update = async (req, res) => {
  const slot = await slotService.update(req.params.id, req.body);
  req.auditContext = { entity: 'TimeSlot', entityId: slot.id, after: slot };
  return success(res, { data: slot, message: 'Time slot updated successfully' });
};

export const toggle = async (req, res) => {
  const slot = await slotService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'TimeSlot', entityId: slot.id, after: slot };
  return success(res, { data: slot, message: 'Time slot updated successfully' });
};

export const reorder = async (req, res) => {
  await slotService.reorder(req.body.items);
  req.auditContext = { entity: 'TimeSlot', entityId: 'bulk-reorder' };
  return success(res, { message: 'Time slots reordered successfully' });
};

export const remove = async (req, res) => {
  const slot = await slotService.remove(req.params.id);
  req.auditContext = { entity: 'TimeSlot', entityId: slot.id, before: slot };
  return success(res, { message: 'Time slot deleted successfully' });
};
