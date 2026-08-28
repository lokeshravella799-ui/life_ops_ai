const db = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class MemoryController {
  async getMemories(req, res, next) {
    try {
      const memories = await db.getMemoriesByUserId(req.user.id);
      return successResponse(res, { memories });
    } catch (err) {
      next(err);
    }
  }

  async createMemory(req, res, next) {
    try {
      const { category, keyTag, content } = req.body;
      if (!content || content.trim().length === 0) {
        return errorResponse(res, 'Memory content is required', 'VALIDATION_ERROR', 400);
      }

      const memory = await db.createMemory({
        user_id: req.user.id,
        category: category || 'GENERAL',
        key_tag: keyTag || 'preference',
        content: content.trim(),
        is_active: true
      });

      return successResponse(res, { memory }, 201);
    } catch (err) {
      next(err);
    }
  }

  async deleteMemory(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await db.deleteMemory(id, req.user.id);
      if (!deleted) {
        return errorResponse(res, 'Memory not found', 'NOT_FOUND', 404);
      }
      return successResponse(res, { message: 'Memory deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MemoryController();
