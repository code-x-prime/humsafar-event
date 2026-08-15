import { error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

// Turns a raw Prisma unique-constraint violation (P2002) into a clean 409
// instead of the default 500 with the full Prisma error dump — every model
// with a @unique field (slug, email, etc.) benefits without needing its own
// try/catch in the service layer.
//
// err.meta.target is an array of column names for a plain @unique field
// (e.g. ['slug']), but for a composite @@id/@@unique — the join tables like
// ProductCategory, ProductCity, ProductAddOn, ProductSectionItem — Postgres
// instead reports the constraint's name as a single string (e.g.
// "Product_pkey" or a custom map name). Falling back to a bare "value" there
// left the message with no actionable detail, so we recognize that shape and
// name the relation instead.
function fromPrismaError(err) {
  if (err.code !== 'P2002') return null;

  const target = err.meta?.target;

  if (Array.isArray(target)) {
    return {
      status: 409,
      code: ERROR_CODES.CONFLICT,
      message: `This ${target.join(', ')} is already in use — please choose a different one.`,
    };
  }

  if (typeof target === 'string') {
    const relationHint = target.match(/^([A-Za-z]+)/)?.[1];
    const readable = relationHint
      ? relationHint.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
      : 'entry';
    return {
      status: 409,
      code: ERROR_CODES.CONFLICT,
      message: `That ${readable} was already added — remove the duplicate selection and try again.`,
    };
  }

  return {
    status: 409,
    code: ERROR_CODES.CONFLICT,
    message: 'This value is already in use — please choose a different one.',
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
