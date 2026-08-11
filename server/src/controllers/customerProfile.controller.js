import * as customerProfileService from '../services/customerProfile.service.js';
import { success } from '../utils/apiResponse.js';

export const getProfile = async (req, res) => {
  const profile = await customerProfileService.getProfile(req.user.sub);
  return success(res, { data: profile, message: 'Profile fetched' });
};

export const updateProfile = async (req, res) => {
  const profile = await customerProfileService.updateProfile(req.user.sub, req.body);
  return success(res, { data: profile, message: 'Profile updated' });
};
