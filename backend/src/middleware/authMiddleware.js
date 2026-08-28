const db = require('../config/supabase');
const { errorResponse } = require('../utils/responseFormatter');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return errorResponse(res, 'Authentication token required', 'UNAUTHORIZED', 401);
  }

  try {
    const user = await db.verifyAuthToken(token);

    if (!user) {
      return errorResponse(res, 'Invalid or expired authentication session', 'UNAUTHORIZED', 401);
    }

    req.user = {
      id: user.id,
      email: user.email
    };
    next();
  } catch (err) {
    return errorResponse(res, 'Authentication failed: ' + err.message, 'FORBIDDEN', 403);
  }
}

module.exports = {
  authenticateToken
};
