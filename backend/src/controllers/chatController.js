const chatService = require('../services/chatService');
const db = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class ChatController {
  /**
   * Handle conversational chat and query routing
   */
  async sendMessage(req, res, next) {
    try {
      const { message, conversationId, history } = req.body;
      const userId = req.user?.id || null;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return errorResponse(res, 'Message cannot be empty', 400, 'INVALID_INPUT');
      }

      const result = await chatService.processMessage({
        message,
        conversationId,
        history,
        userId
      });

      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all previous conversations for the active user
   */
  async listConversations(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const conversations = await db.getConversationsByUserId(userId);
      return successResponse(res, { conversations }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get a specific conversation and its full message history
   */
  async getConversation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || null;
      const conversation = await db.getConversationById(id, userId);
      
      if (!conversation) {
        return errorResponse(res, 'Conversation not found', 404, 'NOT_FOUND');
      }

      return successResponse(res, { conversation }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Save or sync a conversation and its messages
   */
  async saveConversation(req, res, next) {
    try {
      const { id, title, messages } = req.body;
      const userId = req.user?.id || null;

      if (!id || !Array.isArray(messages)) {
        return errorResponse(res, 'Conversation id and messages array are required', 400, 'INVALID_INPUT');
      }

      const savedMessages = await db.saveConversationMessages(id, messages, userId);
      return successResponse(res, { success: true, count: savedMessages.length }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || null;
      const deleted = await db.deleteConversation(id, userId);

      if (!deleted) {
        return errorResponse(res, 'Conversation not found or could not be deleted', 404, 'NOT_FOUND');
      }

      return successResponse(res, { message: 'Conversation deleted successfully' }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChatController();
