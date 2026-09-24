import { ApiError } from '../utils/ApiError.js';

export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw ApiError.badRequest(
        'Validation failed',
        result.error.issues.map((issue) => ({
          field: issue.path.join('.') || source,
          message: issue.message,
        })),
      );
    }

    if (source === 'body') {
      req.body = result.data;
    } else {
      // req.query / req.params are read-only getters in Express 5.
      req.validated = { ...(req.validated || {}), [source]: result.data };
    }
    next();
  };
