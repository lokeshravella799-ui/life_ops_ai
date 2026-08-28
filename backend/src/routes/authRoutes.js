const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateBody } = require('../middleware/validateMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { registerSchema, loginSchema, updateProfileSchema } = require('../validators/authValidator');

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.patch('/profile', authenticateToken, validateBody(updateProfileSchema), authController.updateProfile);

module.exports = router;
