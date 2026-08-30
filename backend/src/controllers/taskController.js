const db = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class TaskController {
  async getTasks(req, res, next) {
    try {
      const { goalId, goal_id, workflowId, workflow_id, status, priority } = req.query;
      const tasks = await db.getTasks(req.user.id, {
        goal_id: goalId || goal_id,
        workflow_id: workflowId || workflow_id,
        status,
        priority
      });
      return successResponse(res, { tasks });
    } catch (err) {
      next(err);
    }
  }

  async getTaskById(req, res, next) {
    try {
      const { id } = req.params;
      const task = await db.getTaskById(id, req.user.id);
      if (!task) {
        return errorResponse(res, 'Task not found', 'NOT_FOUND', 404);
      }
      const dependencies = await db.getTaskDependencies(id);
      return successResponse(res, { task, dependencies });
    } catch (err) {
      next(err);
    }
  }

  async createTask(req, res, next) {
    try {
      const {
        title,
        description,
        goalId,
        goal_id,
        workflowId,
        workflow_id,
        priority,
        dayNumber,
        day_number,
        estimatedMinutes,
        estimated_minutes,
        dueDate,
        due_date,
        notes
      } = req.body;

      if (!title || title.trim().length === 0) {
        return errorResponse(res, 'Task title is required', 'VALIDATION_ERROR', 400);
      }

      const created = await db.createTasksBulk([{
        user_id: req.user.id,
        goal_id: goalId || goal_id || null,
        workflow_id: workflowId || workflow_id || null,
        title: title.trim(),
        description: (description || '').trim(),
        priority: priority || 'MEDIUM',
        status: 'TODO',
        day_number: Number(dayNumber || day_number) || 1,
        estimated_minutes: Number(estimatedMinutes || estimated_minutes) || 60,
        due_date: dueDate || due_date || null,
        notes: notes || ''
      }]);

      return successResponse(res, { task: created[0] }, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await db.updateTask(id, req.user.id, updates);
      if (!updated) {
        return errorResponse(res, 'Task not found', 'NOT_FOUND', 404);
      }

      if (updates.status === 'COMPLETED') {
        await db.createActivityLog({
          user_id: req.user.id,
          workflow_id: updated.workflow_id,
          actor_type: 'USER',
          actor_name: req.user.email,
          action: 'TASK_COMPLETED',
          details: { taskId: updated.id, title: updated.title }
        });
      }

      return successResponse(res, { task: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await db.deleteTask(id, req.user.id);
      if (!deleted) {
        return errorResponse(res, 'Task not found', 'NOT_FOUND', 404);
      }
      return successResponse(res, { message: 'Task deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TaskController();
