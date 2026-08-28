const db = require('../config/supabase');
const { successResponse } = require('../utils/responseFormatter');

class ActivityController {
  async getActivityLogs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const logs = await db.getActivityLogsByUserId(req.user.id, limit);
      return successResponse(res, { logs });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardStats(req, res, next) {
    try {
      const goals = await db.getGoalsByUserId(req.user.id);
      const workflows = await db.getWorkflowsByUserId(req.user.id);
      const tasks = await db.getTasks(req.user.id);
      const memories = await db.getMemoriesByUserId(req.user.id);
      const logs = await db.getActivityLogsByUserId(req.user.id, 10);

      const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return successResponse(res, {
        stats: {
          activeGoals: goals.filter(g => g.status === 'ACTIVE').length,
          totalGoals: goals.length,
          activeWorkflows: workflows.filter(w => w.status === 'RUNNING' || w.status === 'COMPLETED' || w.status === 'ADAPTED').length,
          totalWorkflows: workflows.length,
          pendingTasks: tasks.filter(t => t.status !== 'COMPLETED').length,
          completedTasks,
          totalTasks,
          completionRate,
          activeMemories: memories.filter(m => m.is_active !== false).length
        },
        recentActivity: logs,
        recentWorkflows: workflows.slice(0, 5),
        recentTasks: tasks.slice(0, 8)
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ActivityController();
