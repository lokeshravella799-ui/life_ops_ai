const express = require('express');
const router = express.Router();
const artifactController = require('../controllers/artifactController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Authenticated Artifact endpoints
router.get('/', authenticateToken, artifactController.getUserArtifacts);
router.get('/:id', authenticateToken, artifactController.getArtifactById);
router.get('/:id/download', authenticateToken, artifactController.downloadArtifact);

module.exports = router;
