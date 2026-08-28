const db = require('../config/supabase');
const geminiService = require('../services/geminiService');
const { replanOutputSchema } = require('../validators/agentOutputSchemas');
const logger = require('../utils/logger');

class ReplanningEngine {
  /**
   * Execute Adaptive Replanning when user circumstances change
   */
  async replan({ userId, workflowId, disruptionReason, missedDays = 1, completedTaskIds = [] }) {
    logger.info(`Starting Adaptive Replan for workflow ${workflowId}, user ${userId}: "${disruptionReason}"`);

    // 1. Fetch Workflow, Goal, and Current Tasks
    const workflow = await db.getWorkflowById(workflowId, userId);
    if (!workflow) {
      throw new Error('Workflow not found or unauthorized');
    }

    const currentTasks = await db.getTasks(userId, { workflow_id: workflowId });
    if (currentTasks.length === 0) {
      throw new Error('No tasks found to replan');
    }

    // Identify already completed vs pending tasks
    const completedTasks = currentTasks.filter(t => t.status === 'COMPLETED' || completedTaskIds.includes(t.id));
    const pendingTasks = currentTasks.filter(t => t.status !== 'COMPLETED' && !completedTaskIds.includes(t.id));

    // Calculate timeline adjustments
    const totalOriginalDays = Math.max(...currentTasks.map(t => t.day_number || 1), currentTasks.length);
    const remainingDays = Math.max(1, totalOriginalDays - completedTasks.length - missedDays);

    const oldPlanSummary = currentTasks.map(t => `Day ${t.day_number}: ${t.title} [${t.priority}] - ${t.status}`).join('\n');

    // 2. Run Gemini Replan Prompt
    const systemInstruction = `You are the Adaptive Replanning Engine in LifeOps AI.
The user was following an execution plan, but an unexpected disruption occurred (e.g. missed days, illness, delay, reduced study time).
Your goal is to intelligently adapt the remaining tasks without losing high-priority milestones.
Recalculate the day assignments, adjust priorities if needed, consolidate review buffers, and provide an explicit comparison of the changes.

Respond strictly with a JSON object matching this schema:
{
  "disruptionSummary": "Clear summary of what changed and what caused the replan",
  "adjustmentStrategy": "e.g. Workload compression, high-yield elevation, buffer consolidation",
  "oldPlanOverview": "Brief summary of the original timeline",
  "newPlanOverview": "Brief summary of the updated timeline and adjusted schedule",
  "deltaSummary": "Key differences between old and new schedule",
  "changesMade": ["Change 1", "Change 2", "Change 3"],
  "updatedTasks": [
    {
      "title": "Task Title",
      "description": "Adjusted action items",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "dayNumber": number (adjusted day index starting from next available day),
      "estimatedMinutes": number (e.g. 210 for slight buffer increase),
      "status": "TODO",
      "notes": "Adjustment note"
    }
  ]
}`;

    const prompt = `Disruption Reason: "${disruptionReason}"
Missed Days Count: ${missedDays}
Original Total Days: ${totalOriginalDays}
Completed Tasks: ${JSON.stringify(completedTasks.map(t => t.title))}
Pending Tasks to Reschedule: ${JSON.stringify(pendingTasks.map(t => ({ id: t.id, title: t.title, currentDay: t.day_number, priority: t.priority })))}
Target Remaining Days: ${remainingDays}`;

    const fallbackGenerator = () => {
      // Intelligently shift remaining pending tasks
      const startDay = completedTasks.length + missedDays + 1;
      const updatedTasks = pendingTasks.map((t, idx) => {
        const newDay = Math.min(totalOriginalDays, startDay + idx);
        const isHighYield = /normalization|sql|transaction|serializability/i.test(t.title);
        
        return {
          title: t.title,
          description: t.description || `Adapted study milestone. Focus on core problem sets to recover missed day ${missedDays}.`,
          priority: isHighYield ? 'HIGH' : t.priority,
          dayNumber: newDay,
          estimatedMinutes: 210, // Slight daily increase from 180 min to absorb missed content
          status: 'TODO',
          notes: `Rescheduled from original schedule. Daily session increased by 30 mins to compensate for missed day.`
        };
      });

      return {
        disruptionSummary: `Detected schedule disruption: "${disruptionReason}". User missed ${missedDays} day(s) with ${pendingTasks.length} pending modules.`,
        adjustmentStrategy: 'Dynamic Workload Compression & High-Yield Elevation: Increased remaining daily study sessions by 30 minutes and consolidated final mock buffers to maintain exam readiness.',
        oldPlanOverview: `Original ${totalOriginalDays}-day plan distributed at 3 hours/day.`,
        newPlanOverview: `Rebalanced ${remainingDays}-day plan distributed at 3.5 hours/day with high-priority topics preserved.`,
        deltaSummary: `Rescheduled ${pendingTasks.length} pending tasks starting from Day ${startDay}. Final mock exams streamlined without dropping core Normalization or SQL topics.`,
        changesMade: [
          `Compensated for ${missedDays} missed day by increasing daily study sessions from 180 min to 210 min.`,
          `Shifted pending milestones forward to resume cleanly on Day ${startDay}.`,
          `Elevated Normalization and Transaction Concurrency tasks to HIGH priority.`
        ],
        updatedTasks
      };
    };

    const replanResult = await geminiService.generateStructuredOutput({
      prompt,
      systemInstruction,
      schema: replanOutputSchema,
      agentName: 'Replanning Engine',
      fallbackGenerator
    });

    // 3. Update Tasks in Database
    // Update existing pending tasks with new day numbers and notes
    for (let i = 0; i < pendingTasks.length; i++) {
      const original = pendingTasks[i];
      const updated = replanResult.updatedTasks[i];
      if (updated) {
        await db.updateTask(original.id, userId, {
          title: updated.title,
          description: updated.description,
          priority: updated.priority,
          day_number: updated.dayNumber,
          estimated_minutes: updated.estimatedMinutes,
          notes: updated.notes
        });
      }
    }

    // 4. Fetch updated task list
    const refreshedTasks = await db.getTasks(userId, { workflow_id: workflowId });

    // 5. Store Plan Revision Diff in Database
    const revisionCount = (await db.getPlanRevisions(workflowId, userId)).length + 1;

    const planRevision = await db.createPlanRevision({
      workflow_id: workflowId,
      user_id: userId,
      revision_number: revisionCount,
      change_reason: disruptionReason,
      old_plan: {
        tasks: currentTasks,
        summary: oldPlanSummary
      },
      new_plan: {
        tasks: refreshedTasks,
        summary: replanResult.newPlanOverview,
        changesMade: replanResult.changesMade,
        deltaSummary: replanResult.deltaSummary,
        adjustmentStrategy: replanResult.adjustmentStrategy
      },
      impact_summary: replanResult.deltaSummary
    });

    // 6. Update Workflow Status
    await db.updateWorkflow(workflowId, userId, {
      status: 'ADAPTED',
      summary: `Adapted Plan (Rev ${revisionCount}): ${replanResult.adjustmentStrategy}`
    });

    // 7. Activity Log
    await db.createActivityLog({
      user_id: userId,
      workflow_id: workflowId,
      actor_type: 'AGENT',
      actor_name: 'Replanning Engine',
      action: 'PLAN_ADAPTED',
      details: {
        revisionNumber: revisionCount,
        disruptionReason,
        tasksRescheduled: pendingTasks.length
      }
    });

    return {
      revision: planRevision,
      replanData: replanResult,
      tasks: refreshedTasks
    };
  }
}

module.exports = new ReplanningEngine();
