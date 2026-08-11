import * as bannerService from '../services/banner.service.js';
import { success, error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

const VALID_PLACEMENTS = ['HOME_HERO', 'HOME_STRIP', 'CATEGORY_TOP', 'OFFER_POPUP'];

export const listActive = async (req, res) => {
  const placement = String(req.query.placement || 'HOME_HERO').toUpperCase();

  if (!VALID_PLACEMENTS.includes(placement)) {
    return error(res, {
      status: 422,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `placement must be one of: ${VALID_PLACEMENTS.join(', ')}`,
    });
  }

  const banners = await bannerService.listActiveByPlacement(placement);
  return success(res, { data: banners, message: 'Banners fetched' });
};
