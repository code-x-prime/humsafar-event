import * as cityService from '../services/city.service.js';
import { success, error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

export const listPublic = async (req, res) => {
  const grouped = await cityService.listGroupedByRegion();
  return success(res, { data: grouped, message: 'Cities fetched' });
};

export const getBySlug = async (req, res) => {
  const city = await cityService.getBySlug(req.params.slug);
  return success(res, { data: city, message: 'City fetched' });
};

export const detect = async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'lat and lng are required' });
  }

  const nearest = await cityService.detectNearest(lat, lng);
  return success(res, {
    data: nearest,
    message: nearest ? 'Nearest city detected' : 'No serviceable cities with coordinates yet',
  });
};
