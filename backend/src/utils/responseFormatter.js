function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

function errorResponse(res, message, codeOrStatus = 'INTERNAL_ERROR', statusOrCode = 500, details = null) {
  let code = 'INTERNAL_ERROR';
  let statusCode = 500;

  if (typeof codeOrStatus === 'number') {
    statusCode = codeOrStatus;
    code = typeof statusOrCode === 'string' ? statusOrCode : 'ERROR';
  } else {
    code = codeOrStatus || 'INTERNAL_ERROR';
    statusCode = typeof statusOrCode === 'number' ? statusOrCode : 500;
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}

module.exports = {
  successResponse,
  errorResponse
};
