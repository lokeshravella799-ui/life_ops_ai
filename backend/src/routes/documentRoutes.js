const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/process-text', documentController.processText);
router.get('/', documentController.getDocuments);

module.exports = router;
