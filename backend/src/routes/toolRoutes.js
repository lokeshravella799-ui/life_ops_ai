const express = require('express');
const router = express.Router();
const toolController = require('../controllers/toolController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public or Authenticated tool list
router.get('/', toolController.listTools);

// Authenticated Tool Execution
router.post('/execute', authenticateToken, toolController.executeTool);

module.exports = router;
