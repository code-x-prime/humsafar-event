import { error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

export function notFound(req, res) {
  return error(res, {
    status: 404,
    code: ERROR_CODES.NOT_FOUND,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
