import { verifyAccessToken } from '../utils/jwt.js';
import { error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

export function verifyJWT(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return error(res, { status: 401, code: ERROR_CODES.UNAUTHENTICATED, message: 'Missing bearer token' });
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return error(res, { status: 401, code: ERROR_CODES.INVALID_TOKEN, message: 'Invalid or expired token' });
  }
}

// Attaches req.user if a valid token is present; never blocks the request.
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // ignore invalid token — treat as unauthenticated
    }
  }

  return next();
}
