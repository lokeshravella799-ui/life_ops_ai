const db = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, fullName, role } = req.body;

      // Register using Supabase Auth
      const user = await db.createAuthUser(email, password, {
        full_name: fullName || email.split('@')[0],
        role: role || 'Member'
      });

      const profile = await db.getProfileByUserId(user.id);

      return successResponse(res, {
        token: user.id, // For local test fallback; real Supabase client issues JWT access_token
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        },
        profile
      }, 201);
    } catch (err) {
      if (err.message && err.message.includes('already registered')) {
        return errorResponse(res, 'User with this email already exists in Supabase Auth', 'USER_EXISTS', 400);
      }
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const authData = await db.loginAuthUser(email, password);
      const user = authData.user;
      const profile = authData.profile || await db.getProfileByUserId(user.id);
      const token = authData.session?.access_token || user.id;

      return successResponse(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        },
        profile
      });
    } catch (err) {
      return errorResponse(res, err.message || 'Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }
  }

  async getMe(req, res, next) {
    try {
      const profile = await db.getProfileByUserId(req.user.id);

      return successResponse(res, {
        user: {
          id: req.user.id,
          email: req.user.email
        },
        profile
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updates = req.body;
      const updated = await db.updateProfile(req.user.id, updates);
      return successResponse(res, { profile: updated });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
