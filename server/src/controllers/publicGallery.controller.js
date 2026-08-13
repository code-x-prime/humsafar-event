import * as galleryService from '../services/gallery.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const homeOnly = String(req.query.homeOnly || '') === 'true';
  const images = await galleryService.listPublic({ homeOnly });
  return success(res, { data: images, message: 'Gallery images fetched' });
};
