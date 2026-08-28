const { z } = require('zod');

const reminderInputSchema = z.object({
  reminders: z.array(z.object({
    taskTitle: z.string(),
    triggerOffsetDays: z.number().default(0),
    preferredTime: z.string().default('09:00 AM'),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
  }))
});

const reminderOutputSchema = z.object({
  totalReminders: z.number(),
  reminders: z.array(z.object({
    id: z.string(),
    taskTitle: z.string(),
    triggerOffsetDays: z.number(),
    preferredTime: z.string(),
    urgency: z.string()
  })),
  integrationNote: z.string()
});

async function executeReminderRecommendation(input, context = {}) {
  const { reminders = [] } = input;

  const formattedReminders = reminders.map((r, idx) => ({
    id: `rem_${idx + 1}`,
    taskTitle: r.taskTitle,
    triggerOffsetDays: r.triggerOffsetDays || 0,
    preferredTime: r.preferredTime || '09:00 AM',
    urgency: r.urgency || 'MEDIUM'
  }));

  return {
    totalReminders: formattedReminders.length,
    reminders: formattedReminders,
    integrationNote: 'Reminders generated for notification dispatch. External push notifications require device permission.'
  };
}

module.exports = {
  name: 'REMINDER_RECOMMENDATION',
  description: 'Generates intelligent, context-aware notification reminder recommendations.',
  capability: 'REMINDER_RECOMMENDATION',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: reminderInputSchema,
  outputSchema: reminderOutputSchema,
  execute: executeReminderRecommendation
};
