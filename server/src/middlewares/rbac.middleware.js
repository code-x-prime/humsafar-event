import { error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, { status: 403, code: ERROR_CODES.FORBIDDEN, message: 'Insufficient permissions' });
    }
    return next();
  };
}
