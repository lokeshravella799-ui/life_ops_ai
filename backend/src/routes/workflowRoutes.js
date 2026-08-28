const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const toolController = require('../controllers/toolController');
const artifactController = require('../controllers/artifactController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { orchestrateGoalSchema, replanWorkflowSchema } = require('../validators/workflowValidator');

router.use(authenticateToken);

router.post('/orchestrate', validateBody(orchestrateGoalSchema), workflowController.orchestrate);
router.get('/', workflowController.getWorkflows);
router.get('/:id', workflowController.getWorkflowById);
router.post('/:id/replan', validateBody(replanWorkflowSchema), workflowController.replanWorkflow);
router.get('/:id/revisions', workflowController.getRevisions);

// Phase 8 Workflow Actions & Artifacts
router.get('/:id/actions', toolController.getWorkflowActions);
router.post('/:id/actions/:actionId/confirm', toolController.confirmAction);
router.get('/:id/artifacts', artifactController.getWorkflowArtifacts);

module.exports = router;
