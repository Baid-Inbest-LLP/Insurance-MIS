// True for values worth serialising: skips null/undefined and empty plain
// objects like `{}`, but always keeps arrays (an empty list is a valid payload).
const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

// Copy only the keys whose values are meaningful onto the response body.
const withDefined = (base, extras) => {
  for (const [key, value] of Object.entries(extras)) {
    if (hasValue(value)) base[key] = value;
  }
  return base;
};

export class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200, meta = {}) {
    return res.status(statusCode).json(withDefined({ success: true, message }, { data, meta }));
  }

  static created(res, data, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json(withDefined({ success: true, message }, { data, pagination }));
  }

  static error(res, message = 'Something went wrong', statusCode = 500, errors = null) {
    return res.status(statusCode).json(withDefined({ success: false, message }, { errors }));
  }
}
