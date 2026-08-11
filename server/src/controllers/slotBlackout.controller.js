import * as slotBlackoutService from '../services/slotBlackout.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await slotBlackoutService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Slot blackouts fetched', meta });
};

export const getById = async (req, res) => {
  const blackout = await slotBlackoutService.getById(req.params.id);
  return success(res, { data: blackout, message: 'Slot blackout fetched' });
};

export const create = async (req, res) => {
  const blackout = await slotBlackoutService.create(req.body);
  req.auditContext = { entity: 'SlotBlackout', entityId: blackout.id, after: blackout };
  return success(res, { status: 201, data: blackout, message: 'Slot blackout created successfully' });
};

export const update = async (req, res) => {
  const blackout = await slotBlackoutService.update(req.params.id, req.body);
  req.auditContext = { entity: 'SlotBlackout', entityId: blackout.id, after: blackout };
  return success(res, { data: blackout, message: 'Slot blackout updated successfully' });
};

export const remove = async (req, res) => {
  const blackout = await slotBlackoutService.remove(req.params.id);
  req.auditContext = { entity: 'SlotBlackout', entityId: blackout.id, before: blackout };
  return success(res, { message: 'Slot blackout deleted successfully' });
};
