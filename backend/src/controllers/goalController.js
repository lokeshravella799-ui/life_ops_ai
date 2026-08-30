const db = require('../config/supabase');
const workflowEngine = require('../orchestrator/workflowEngine');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class GoalController {
  async createGoal(req, res, next) {
    try {
      const {
        title,
        description,
        category,
        priority,
        targetDate,
        target_days,
        targetDays,
        daily_hours,
        dailyHours,
        constraints,
        autoOrchestrate
      } = req.body;

      const effectiveDays = Number(target_days || targetDays) || 7;
      const effectiveHours = Number(daily_hours || dailyHours) || 2;
      const effectiveCategory = category || 'PERSONAL';
      const effectivePriority = priority || 'MEDIUM';

      const goal = await db.createGoal({
        user_id: req.user.id,
        title: title.trim(),
        description: (description || '').trim() || `Goal: ${title.trim()}`,
        category: effectiveCategory,
        priority: effectivePriority,
        target_days: effectiveDays,
        daily_hours: effectiveHours,
        target_date: targetDate || null,
        constraints: constraints || [],
        status: 'ACTIVE'
      });

      await db.createActivityLog({
        user_id: req.user.id,
        actor_type: 'USER',
        actor_name: req.user.email,
        action: 'GOAL_CREATED',
        details: { goalId: goal.id, title: goal.title }
      });

      let workflow = null;
      let tasks = [];

      // If auto-orchestration requested (e.g. from Add Goal button or standard goal creation)
      if (autoOrchestrate) {
        try {
          const orchestrationResult = await workflowEngine.orchestrateGoal({
            userId: req.user.id,
            goalText: `${goal.title}: ${goal.description}`,
            category: effectiveCategory,
            targetDays: effectiveDays,
            dailyHours: effectiveHours,
            existingGoalId: goal.id
          });
          workflow = orchestrationResult.workflow;
          tasks = orchestrationResult.tasks || [];
        } catch (orchErr) {
          console.warn('⚠️ Auto-orchestration deferred or failed on goal creation:', orchErr.message);
        }
      }

      return successResponse(res, {
        goal,
        workflow,
        tasks,
        workflowId: workflow?.id || null
      }, 201);
    } catch (err) {
      next(err);
    }
  }

  async getGoals(req, res, next) {
    try {
      const goals = await db.getGoalsByUserId(req.user.id);
      const allTasks = await db.getTasks(req.user.id);
      const allWorkflows = await db.getWorkflowsByUserId(req.user.id);

      // Enhance goals with real-time calculated task completion and workflow IDs
      const enrichedGoals = goals.map((goal) => {
        const goalTasks = allTasks.filter((t) => t.goal_id === goal.id);
        const goalWorkflows = allWorkflows.filter((w) => w.goal_id === goal.id);
        const completedTasks = goalTasks.filter((t) => t.status === 'COMPLETED').length;
        const totalTasks = goalTasks.length;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...goal,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          progress_percentage: progressPercentage,
          workflow_id: goalWorkflows[0]?.id || null,
          has_workflow: goalWorkflows.length > 0
        };
      });

      return successResponse(res, { goals: enrichedGoals });
    } catch (err) {
      next(err);
    }
  }

  async getGoalById(req, res, next) {
    try {
      const { id } = req.params;
      const goal = await db.getGoalById(id, req.user.id);
      if (!goal) {
        return errorResponse(res, 'Goal not found', 'NOT_FOUND', 404);
      }

      const tasks = await db.getTasks(req.user.id, { goal_id: id });
      const workflows = (await db.getWorkflowsByUserId(req.user.id)).filter((w) => w.goal_id === id);
      const primaryWorkflow = workflows[0] || null;

      let agents = [];
      let revisions = [];
      let artifacts = [];
      let actions = [];

      if (primaryWorkflow) {
        agents = await db.getWorkflowAgentsByWorkflowId(primaryWorkflow.id);
        revisions = await db.getPlanRevisions(primaryWorkflow.id, req.user.id);
        artifacts = await db.getArtifactsByWorkflowId(primaryWorkflow.id, req.user.id);
        actions = await db.getActionRequestsByWorkflowId(primaryWorkflow.id, req.user.id);
      }

      const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
      const totalTasks = tasks.length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return successResponse(res, {
        goal: {
          ...goal,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          progress_percentage: progressPercentage
        },
        workflow: primaryWorkflow,
        workflows,
        tasks,
        agents,
        revisions,
        artifacts,
        actions,
        progress: {
          total: totalTasks,
          completed: completedTasks,
          percentage: progressPercentage
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async generateWorkflow(req, res, next) {
    try {
      const { id } = req.params;
      const goal = await db.getGoalById(id, req.user.id);
      if (!goal) {
        return errorResponse(res, 'Goal not found', 'NOT_FOUND', 404);
      }

      const orchestrationResult = await workflowEngine.orchestrateGoal({
        userId: req.user.id,
        goalText: `${goal.title}: ${goal.description}`,
        category: goal.category || 'PERSONAL',
        targetDays: goal.target_days || 7,
        dailyHours: goal.daily_hours || 2,
        existingGoalId: goal.id
      });

      return successResponse(res, {
        goalId: goal.id,
        workflowId: orchestrationResult.workflowId,
        workflow: orchestrationResult.workflow,
        tasks: orchestrationResult.tasks,
        agents: orchestrationResult.agents,
        artifacts: orchestrationResult.artifacts,
        plan: orchestrationResult.plan
      }, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateGoal(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await db.updateGoal(id, req.user.id, updates);
      if (!updated) {
        return errorResponse(res, 'Goal not found', 'NOT_FOUND', 404);
      }
      return successResponse(res, { goal: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteGoal(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await db.deleteGoal(id, req.user.id);
      if (!deleted) {
        return errorResponse(res, 'Goal not found', 'NOT_FOUND', 404);
      }
      return successResponse(res, { message: 'Goal and associated workflows/tasks deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new GoalController();
