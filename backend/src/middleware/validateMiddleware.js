const { errorResponse } = require('../utils/responseFormatter');

function validateBody(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      const formattedErrors = err.errors ? err.errors.map(e => ({ field: e.path.join('.'), message: e.message })) : err.message;
      return errorResponse(res, 'Validation failed for request body', 'VALIDATION_ERROR', 400, formattedErrors);
    }
  };
}

module.exports = {
  validateBody
};
