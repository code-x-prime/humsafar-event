import * as pincodeService from '../services/pincode.service.js';
import { checkServiceability } from '../services/location.service.js';
import { success, error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

export const list = async (req, res) => {
  const { items, meta } = await pincodeService.list(req.validatedQuery || req.query);
  return res.status(200).json({ success: true, data: items, message: 'Pincodes fetched', meta });
};

export const create = async (req, res) => {
  const pincode = await pincodeService.create(req.body);
  req.auditContext = { entity: 'Pincode', entityId: pincode.id, after: pincode };
  return success(res, { status: 201, data: pincode, message: 'Pincode added' });
};

export const bulkRange = async (req, res) => {
  const result = await pincodeService.bulkRange(req.body);
  req.auditContext = { entity: 'Pincode', entityId: 'bulk-range', after: result };
  return success(res, { data: result, message: 'Pincode range processed' });
};

export const previewImport = async (req, res) => {
  if (!req.file) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'CSV file is required' });
  }
  const preview = await pincodeService.previewImport(req.file.buffer.toString('utf8'));
  return success(res, { data: preview, message: 'Import preview generated' });
};

export const commitImport = async (req, res) => {
  if (!req.file) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'CSV file is required' });
  }
  const result = await pincodeService.commitImport(req.file.buffer.toString('utf8'));
  req.auditContext = { entity: 'Pincode', entityId: 'bulk-import', after: result };
  return success(res, { data: result, message: 'Import committed' });
};

export const exportCsv = async (req, res) => {
  const csv = await pincodeService.exportCsv(req.query.cityId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pincodes.csv"');
  return res.status(200).send(csv);
};

export const update = async (req, res) => {
  const pincode = await pincodeService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Pincode', entityId: pincode.id, after: pincode };
  return success(res, { data: pincode, message: 'Pincode updated' });
};

export const toggle = async (req, res) => {
  const pincode = await pincodeService.toggle(req.params.id, req.body.isServiceable);
  req.auditContext = { entity: 'Pincode', entityId: pincode.id, after: pincode };
  return success(res, { data: pincode, message: 'Pincode updated' });
};

export const bulkToggle = async (req, res) => {
  const result = await pincodeService.bulkToggle(req.body.ids, req.body.isServiceable);
  req.auditContext = { entity: 'Pincode', entityId: 'bulk-toggle', after: result };
  return success(res, { data: result, message: 'Pincodes updated' });
};

export const remove = async (req, res) => {
  await pincodeService.remove(req.params.id);
  req.auditContext = { entity: 'Pincode', entityId: req.params.id };
  return success(res, { message: 'Pincode deleted' });
};

export const bulkDelete = async (req, res) => {
  const result = await pincodeService.bulkDelete(req.body.ids);
  req.auditContext = { entity: 'Pincode', entityId: 'bulk-delete', after: result };
  return success(res, { data: result, message: 'Pincodes deleted' });
};

// Public: GET /api/v1/pincodes/check?code=122001
export const check = async (req, res) => {
  const { code, cityId } = req.query;

  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Valid 6-digit code is required' });
  }

  const result = await checkServiceability(code, cityId);
  return success(res, { data: result, message: result.serviceable ? 'Serviceable' : 'Not serviceable' });
};
