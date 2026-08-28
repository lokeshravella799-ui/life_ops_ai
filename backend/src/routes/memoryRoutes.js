const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', memoryController.getMemories);
router.post('/', memoryController.createMemory);
router.delete('/:id', memoryController.deleteMemory);

module.exports = router;
