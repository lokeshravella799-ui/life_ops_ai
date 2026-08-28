const { z } = require('zod');

const orchestrateGoalSchema = z.object({
  goalText: z.string().min(5, 'Goal description must be at least 5 characters long'),
  category: z.enum(['STUDY', 'PROJECT', 'TRAVEL', 'DECISION', 'DOCUMENT', 'BUSINESS', 'PERSONAL']).optional().default('PERSONAL'),
  targetDays: z.number().int().positive('Target days must be a positive integer').optional(),
  dailyHours: z.number().positive('Daily hours must be a positive number').optional(),
  goalId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional()
});

const replanWorkflowSchema = z.object({
  disruptionReason: z.string().min(3, 'Please specify the disruption or change reason (e.g. "I couldn\'t study yesterday")'),
  missedDays: z.number().int().nonnegative().optional().default(1),
  completedTaskIds: z.array(z.string()).optional().default([])
});

module.exports = {
  orchestrateGoalSchema,
  replanWorkflowSchema
};
