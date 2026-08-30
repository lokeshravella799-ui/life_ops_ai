const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { createGoalSchema, updateGoalSchema } = require('../validators/goalValidator');

router.use(authenticateToken);

router.post('/', validateBody(createGoalSchema), goalController.createGoal);
router.get('/', goalController.getGoals);
router.get('/:id', goalController.getGoalById);
router.post('/:id/generate-workflow', goalController.generateWorkflow);
router.patch('/:id', validateBody(updateGoalSchema), goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
