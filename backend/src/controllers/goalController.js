const db = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class GoalController {
  async createGoal(req, res, next) {
    try {
      const { title, description, category, targetDate, target_days, targetDays, daily_hours, dailyHours, constraints } = req.body;
      const goal = await db.createGoal({
        user_id: req.user.id,
        title,
        description: description || `Goal: ${title}`,
        category: category || 'PERSONAL',
        target_days: target_days || targetDays || 7,
        daily_hours: daily_hours || dailyHours || 2,
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

      return successResponse(res, { goal }, 201);
    } catch (err) {
      next(err);
    }
  }

  async getGoals(req, res, next) {
    try {
      const goals = await db.getGoalsByUserId(req.user.id);
      return successResponse(res, { goals });
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
      const workflows = (await db.getWorkflowsByUserId(req.user.id)).filter(w => w.goal_id === id);

      return successResponse(res, {
        goal,
        tasks,
        workflows
      });
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
