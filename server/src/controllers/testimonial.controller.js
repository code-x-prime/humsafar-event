import * as testimonialService from '../services/testimonial.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await testimonialService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Testimonials fetched', meta });
};

export const getById = async (req, res) => {
  const testimonial = await testimonialService.getById(req.params.id);
  return success(res, { data: testimonial, message: 'Testimonial fetched' });
};

export const create = async (req, res) => {
  const testimonial = await testimonialService.create(req.body);
  req.auditContext = { entity: 'Testimonial', entityId: testimonial.id, after: testimonial };
  return success(res, { status: 201, data: testimonial, message: 'Testimonial created successfully' });
};

export const update = async (req, res) => {
  const testimonial = await testimonialService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Testimonial', entityId: testimonial.id, after: testimonial };
  return success(res, { data: testimonial, message: 'Testimonial updated successfully' });
};

export const toggle = async (req, res) => {
  const testimonial = await testimonialService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'Testimonial', entityId: testimonial.id, after: testimonial };
  return success(res, { data: testimonial, message: 'Testimonial updated successfully' });
};

export const reorder = async (req, res) => {
  await testimonialService.reorder(req.body.items);
  req.auditContext = { entity: 'Testimonial', entityId: 'bulk-reorder' };
  return success(res, { message: 'Testimonials reordered successfully' });
};

export const remove = async (req, res) => {
  const testimonial = await testimonialService.remove(req.params.id);
  req.auditContext = { entity: 'Testimonial', entityId: testimonial.id, before: testimonial };
  return success(res, { message: 'Testimonial deleted successfully' });
};
