const logger = require('../utils/logger');
const { errorResponse } = require('../utils/responseFormatter');

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled request error on ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected server error occurred. Please try again.'
    : err.message || 'Internal Server Error';

  return errorResponse(res, message, err.code || 'INTERNAL_SERVER_ERROR', statusCode);
}

module.exports = {
  errorHandler
};
