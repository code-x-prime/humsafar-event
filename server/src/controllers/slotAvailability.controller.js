import * as slotAvailabilityService from '../services/slotAvailability.service.js';
import { success } from '../utils/apiResponse.js';

export const getAvailability = async (req, res) => {
  const { cityId, date } = req.validatedQuery;
  const slots = await slotAvailabilityService.getAvailability(cityId, date);
  return success(res, { data: slots, message: 'Slot availability fetched' });
};
