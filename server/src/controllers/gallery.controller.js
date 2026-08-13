import * as galleryService from '../services/gallery.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const images = await galleryService.list();
  return success(res, { data: images, message: 'Gallery images fetched' });
};

export const getById = async (req, res) => {
  const image = await galleryService.getById(req.params.id);
  return success(res, { data: image, message: 'Gallery image fetched' });
};

export const create = async (req, res) => {
  const image = await galleryService.create(req.body);
  req.auditContext = { entity: 'GalleryImage', entityId: image.id, after: image };
  return success(res, { status: 201, data: image, message: 'Gallery image created successfully' });
};

export const update = async (req, res) => {
  const image = await galleryService.update(req.params.id, req.body);
  req.auditContext = { entity: 'GalleryImage', entityId: image.id, after: image };
  return success(res, { data: image, message: 'Gallery image updated successfully' });
};

export const toggle = async (req, res) => {
  const image = await galleryService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'GalleryImage', entityId: image.id, after: image };
  return success(res, { data: image, message: 'Gallery image updated successfully' });
};

export const reorder = async (req, res) => {
  await galleryService.reorder(req.body.items);
  req.auditContext = { entity: 'GalleryImage', entityId: 'bulk-reorder' };
  return success(res, { message: 'Gallery images reordered successfully' });
};

export const remove = async (req, res) => {
  const image = await galleryService.remove(req.params.id);
  req.auditContext = { entity: 'GalleryImage', entityId: image.id, before: image };
  return success(res, { message: 'Gallery image deleted successfully' });
};
