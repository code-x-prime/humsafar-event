import * as variantPresetService from '../services/variantPreset.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const presets = await variantPresetService.list();
  return success(res, { data: presets, message: 'Attribute presets fetched' });
};

export const getById = async (req, res) => {
  const preset = await variantPresetService.getById(req.params.id);
  return success(res, { data: preset, message: 'Attribute preset fetched' });
};

export const create = async (req, res) => {
  const preset = await variantPresetService.create(req.body);
  req.auditContext = { entity: 'VariantPreset', entityId: preset.id, after: preset };
  return success(res, { status: 201, data: preset, message: 'Attribute preset created successfully' });
};

export const update = async (req, res) => {
  const preset = await variantPresetService.update(req.params.id, req.body);
  req.auditContext = { entity: 'VariantPreset', entityId: preset.id, after: preset };
  return success(res, { data: preset, message: 'Attribute preset updated successfully' });
};

export const remove = async (req, res) => {
  const preset = await variantPresetService.remove(req.params.id);
  req.auditContext = { entity: 'VariantPreset', entityId: preset.id, before: preset };
  return success(res, { message: 'Attribute preset deleted successfully' });
};
