import { error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

// Turns a raw Prisma unique-constraint violation (P2002) into a clean 409
// instead of the default 500 with the full Prisma error dump — every model
// with a @unique field (slug, email, etc.) benefits without needing its own
// try/catch in the service layer.
function fromPrismaError(err) {
  if (err.code !== 'P2002') return null;

  const fields = err.meta?.target;
  const fieldList = Array.isArray(fields) ? fields.join(', ') : fields || 'value';

  return {
    status: 409,
    code: ERROR_CODES.CONFLICT,
    message: `This ${fieldList} is already in use — please choose a different one.`,
  };
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  req.log?.error({ err }, 'Unhandled error');

  const prismaMapped = fromPrismaError(err);

  const status = prismaMapped?.status || err.status || 500;
  const code = prismaMapped?.code || err.code || ERROR_CODES.INTERNAL_ERROR;
  const message = prismaMapped?.message || err.message || 'Something went wrong';
  const errors = err.errors || [];

  return error(res, { status, code, message, errors });
}
