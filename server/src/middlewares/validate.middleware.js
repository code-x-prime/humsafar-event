import { error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

// validate(schema, 'body' | 'query' | 'params')
//
// Express 5 makes req.query a getter-only accessor over the parsed URL, so it
// can't be reassigned directly. Validated query data is stashed on
// req.validatedQuery instead; body/params are plain writable properties and
// get reassigned as before.
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const input = source === 'query' ? req.query : req[source];
    const result = schema.safeParse(input);

    if (!result.success) {
      return error(res, {
        status: 422,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    if (source === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }

    return next();
  };
}
