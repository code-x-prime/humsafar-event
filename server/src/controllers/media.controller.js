import * as mediaService from '../services/media.service.js';
import { success, error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

export const list = async (req, res) => {
  const { items, meta } = await mediaService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Media assets fetched', meta });
};

export const getById = async (req, res) => {
  const media = await mediaService.getById(req.params.id);
  return success(res, { data: media, message: 'Media asset fetched' });
};

export const create = async (req, res) => {
  const media = await mediaService.create(req.body, req.user?.sub);
  req.auditContext = { entity: 'MediaAsset', entityId: media.id, after: media };
  return success(res, { status: 201, data: media, message: 'Media asset created successfully' });
};

export const update = async (req, res) => {
  const media = await mediaService.update(req.params.id, req.body);
  req.auditContext = { entity: 'MediaAsset', entityId: media.id, after: media };
  return success(res, { data: media, message: 'Media asset updated successfully' });
};

export const remove = async (req, res) => {
  const media = await mediaService.remove(req.params.id);
  req.auditContext = { entity: 'MediaAsset', entityId: media.id, before: media };
  return success(res, { message: 'Media asset deleted successfully' });
};

export const presign = async (req, res) => {
  const data = await mediaService.presignUpload(req.body);
  return success(res, { data, message: 'Presigned upload URL generated' });
};

export const confirm = async (req, res) => {
  const media = await mediaService.confirmUpload(req.body, req.user?.sub);
  req.auditContext = { entity: 'MediaAsset', entityId: media.id, after: media };
  return success(res, { status: 201, data: media, message: 'Upload confirmed' });
};

export const upload = async (req, res) => {
  if (!req.file) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'File is required' });
  }

  const media = await mediaService.uploadFile(
    {
      folder: req.body.folder || 'uploads',
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
    },
    req.user?.sub
  );

  req.auditContext = { entity: 'MediaAsset', entityId: media.id, after: media };
  return success(res, { status: 201, data: media, message: 'Upload successful' });
};
