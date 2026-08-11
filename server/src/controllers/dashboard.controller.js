import * as dashboardService from '../services/dashboard.service.js';
import { success } from '../utils/apiResponse.js';

export const getOverview = async (req, res) => {
  const data = await dashboardService.getOverview();
  return success(res, { data, message: 'Dashboard overview fetched' });
};

export const getTimeseries = async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 14;
  const data = await dashboardService.getTimeseries(days);
  return success(res, { data, message: 'Dashboard timeseries fetched' });
};
