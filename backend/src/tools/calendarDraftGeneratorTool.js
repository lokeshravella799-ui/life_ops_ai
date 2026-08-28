const { z } = require('zod');

const calendarDraftInputSchema = z.object({
  events: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    durationMinutes: z.number().default(60),
    dayOffset: z.number().default(1),
    timeSlot: z.string().default('18:00 - 19:00'),
    locationOrLink: z.string().optional()
  }))
});

const calendarDraftOutputSchema = z.object({
  totalEvents: z.number(),
  events: z.array(z.object({
    title: z.string(),
    description: z.string(),
    durationMinutes: z.number(),
    dayOffset: z.number(),
    timeSlot: z.string(),
    locationOrLink: z.string()
  })),
  integrationNote: z.string()
});

async function executeCalendarDraft(input, context = {}) {
  const { events = [] } = input;

  const formattedEvents = events.map(evt => ({
    title: evt.title,
    description: evt.description || 'LifeOps AI Milestone Execution Session',
    durationMinutes: evt.durationMinutes || 60,
    dayOffset: evt.dayOffset || 1,
    timeSlot: evt.timeSlot || '18:00 - 19:00',
    locationOrLink: evt.locationOrLink || 'Study/Work Desk'
  }));

  return {
    totalEvents: formattedEvents.length,
    events: formattedEvents,
    integrationNote: 'Calendar drafts generated for local/Google/Apple Calendar import. Direct calendar syncing requires authenticated integration.'
  };
}

module.exports = {
  name: 'CALENDAR_DRAFT_GENERATOR',
  description: 'Generates structured calendar event suggestions and time-blocked study/work sessions.',
  capability: 'CALENDAR_DRAFTING',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: calendarDraftInputSchema,
  outputSchema: calendarDraftOutputSchema,
  execute: executeCalendarDraft
};
