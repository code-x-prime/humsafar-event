import * as blogService from '../services/blog.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await blogService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Blog posts fetched', meta });
};

export const getById = async (req, res) => {
  const post = await blogService.getById(req.params.id);
  return success(res, { data: post, message: 'Blog post fetched' });
};

export const create = async (req, res) => {
  const post = await blogService.create(req.body);
  req.auditContext = { entity: 'BlogPost', entityId: post.id, after: post };
  return success(res, { status: 201, data: post, message: 'Blog post created successfully' });
};

export const update = async (req, res) => {
  const post = await blogService.update(req.params.id, req.body);
  req.auditContext = { entity: 'BlogPost', entityId: post.id, after: post };
  return success(res, { data: post, message: 'Blog post updated successfully' });
};

export const toggle = async (req, res) => {
  const post = await blogService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'BlogPost', entityId: post.id, after: post };
  return success(res, { data: post, message: 'Blog post updated successfully' });
};

export const remove = async (req, res) => {
  const post = await blogService.remove(req.params.id);
  req.auditContext = { entity: 'BlogPost', entityId: post.id, before: post };
  return success(res, { message: 'Blog post deleted successfully' });
};
