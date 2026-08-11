import { getHealth } from '../services/health.service.js';
import { ERROR_CODES } from '../config/constants.js';
import { success, error } from '../utils/apiResponse.js';

export async function health(req, res) {
  const data = await getHealth();

  if (data.db !== 'ok') {
    return error(res, {
      status: 503,
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: 'Health check failed',
      errors: [data],
    });
  }

  return success(res, { data, message: 'healthy' });
}
