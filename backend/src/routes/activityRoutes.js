const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', activityController.getActivityLogs);
router.get('/dashboard-stats', activityController.getDashboardStats);

module.exports = router;
