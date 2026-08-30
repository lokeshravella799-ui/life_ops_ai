const workflowEngine = require('../orchestrator/workflowEngine');
const replanningEngine = require('../orchestrator/replanningEngine');
const db = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

async function orchestrate(req, res, next) {
  try {
    const { goalText, category, targetDays, dailyHours, goalId, idempotencyKey } = req.body;
    const userId = req.user.id;

    const result = await workflowEngine.orchestrateGoal({
      userId,
      goalText,
      category,
      targetDays,
      dailyHours,
      existingGoalId: goalId,
      idempotencyKey
    });

    const responsePayload = {
      workflowId: result.workflowId,
      goalId: result.goalId,
      status: result.status,
      verificationStatus: result.verificationStatus,
      summary: result.summary,
      agents: result.agents,
      tasks: result.tasks,
      artifacts: result.artifacts || [],
      actions: result.actions || [],
      plan: result.plan,
      verification: result.plan?.verification || { status: result.verificationStatus },
      // Compatibility aliases
      workflow: { id: result.workflowId, status: result.status, verification_status: result.verificationStatus, summary: result.summary },
      goal: { id: result.goalId }
    };

    return successResponse(res, responsePayload, 201);
  } catch (err) {
    next(err);
  }
}

async function getWorkflowById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let workflow = await db.getWorkflowById(id, userId);
    if (!workflow) {
      // Check if id is a goal_id
      const workflowsForGoal = (await db.getWorkflowsByUserId(userId)).filter(w => w.goal_id === id);
      if (workflowsForGoal.length > 0) {
        workflow = workflowsForGoal[0];
      }
    }

    if (!workflow) {
      return errorResponse(res, 'Workflow not found', 404, 'WORKFLOW_NOT_FOUND');
    }

    const agents = await db.getWorkflowAgentsByWorkflowId(workflow.id);
    const tasks = await db.getTasks(userId, { workflow_id: workflow.id });
    const revisions = await db.getPlanRevisions(workflow.id, userId);
    const artifacts = await db.getArtifactsByWorkflowId(workflow.id, userId);
    const actions = await db.getActionRequestsByWorkflowId(workflow.id, userId);

    return successResponse(res, {
      workflow,
      agents,
      tasks,
      revisions,
      artifacts,
      actions
    });
  } catch (err) {
    next(err);
  }
}


async function getWorkflows(req, res, next) {
  try {
    const userId = req.user.id;
    const workflows = await db.getWorkflowsByUserId(userId);
    return successResponse(res, workflows);
  } catch (err) {
    next(err);
  }
}

async function replanWorkflow(req, res, next) {
  try {
    const { id } = req.params;
    const { disruptionReason, missedDays, completedTaskIds } = req.body;
    const userId = req.user.id;

    const result = await replanningEngine.replan({
      workflowId: id,
      userId,
      disruptionReason,
      missedDays: missedDays || 1,
      completedTaskIds: completedTaskIds || []
    });

    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
}

async function getRevisions(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const revisions = await db.getPlanRevisions(id, userId);
    return successResponse(res, revisions);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  orchestrate,
  getWorkflowById,
  getWorkflow: getWorkflowById,
  getWorkflows,
  listWorkflows: getWorkflows,
  replanWorkflow,
  getRevisions
};
