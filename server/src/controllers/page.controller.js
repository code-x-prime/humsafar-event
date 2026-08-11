import * as pageService from '../services/page.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await pageService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Pages fetched', meta });
};

export const getById = async (req, res) => {
  const page = await pageService.getById(req.params.id);
  return success(res, { data: page, message: 'Page fetched' });
};

export const create = async (req, res) => {
  const page = await pageService.create(req.body);
  req.auditContext = { entity: 'Page', entityId: page.id, after: page };
  return success(res, { status: 201, data: page, message: 'Page created successfully' });
};

export const update = async (req, res) => {
  const page = await pageService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Page', entityId: page.id, after: page };
  return success(res, { data: page, message: 'Page updated successfully' });
};

export const toggle = async (req, res) => {
  const page = await pageService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'Page', entityId: page.id, after: page };
  return success(res, { data: page, message: 'Page updated successfully' });
};

export const remove = async (req, res) => {
  const page = await pageService.remove(req.params.id);
  req.auditContext = { entity: 'Page', entityId: page.id, before: page };
  return success(res, { message: 'Page deleted successfully' });
};
