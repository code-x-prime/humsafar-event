import * as bannerService from '../services/banner.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await bannerService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Banners fetched', meta });
};

export const getById = async (req, res) => {
  const banner = await bannerService.getById(req.params.id);
  return success(res, { data: banner, message: 'Banner fetched' });
};

export const create = async (req, res) => {
  const banner = await bannerService.create(req.body);
  req.auditContext = { entity: 'Banner', entityId: banner.id, after: banner };
  return success(res, { status: 201, data: banner, message: 'Banner created successfully' });
};

export const update = async (req, res) => {
  const banner = await bannerService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Banner', entityId: banner.id, after: banner };
  return success(res, { data: banner, message: 'Banner updated successfully' });
};

export const toggle = async (req, res) => {
  const banner = await bannerService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'Banner', entityId: banner.id, after: banner };
  return success(res, { data: banner, message: 'Banner updated successfully' });
};

export const reorder = async (req, res) => {
  await bannerService.reorder(req.body.items);
  req.auditContext = { entity: 'Banner', entityId: 'bulk-reorder' };
  return success(res, { message: 'Banners reordered successfully' });
};

export const remove = async (req, res) => {
  const banner = await bannerService.remove(req.params.id);
  req.auditContext = { entity: 'Banner', entityId: banner.id, before: banner };
  return success(res, { message: 'Banner deleted successfully' });
};
