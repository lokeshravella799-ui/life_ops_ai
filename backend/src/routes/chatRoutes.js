const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { validateBody } = require('../middleware/validateMiddleware');
const { chatRequestSchema } = require('../validators/chatValidator');
const db = require('../config/supabase');

// Optional authentication middleware (allows anonymous exploration or authenticated memory tracking)
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const user = await db.verifyAuthToken(token);
      if (user) {
        req.user = { id: user.id, email: user.email };
      }
    } catch (err) {
      // Continue unauthenticated if invalid token
    }
  }
  next();
}

// Conversational AI messaging
router.post('/', optionalAuth, validateBody(chatRequestSchema), chatController.sendMessage);

// Conversation History Endpoints
router.get('/conversations', optionalAuth, chatController.listConversations);
router.get('/conversations/:id', optionalAuth, chatController.getConversation);
router.post('/conversations', optionalAuth, chatController.saveConversation);
router.delete('/conversations/:id', optionalAuth, chatController.deleteConversation);

module.exports = router;
