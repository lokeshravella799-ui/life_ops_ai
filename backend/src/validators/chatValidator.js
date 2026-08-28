const { z } = require('zod');

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional().default([])
});

const responseModeEnum = z.enum([
  // Core Standard Intents
  'GENERAL_QA',
  'TEXT_GENERATION',
  'EXPLANATION',
  'SUMMARIZATION',
  'TRANSLATION',
  'CODING',
  'BRAINSTORMING',
  'CALCULATION',
  'DOCUMENT_GENERATION',
  'TRAVEL_QUERY',
  'STUDY_QUERY',
  'GOAL_PLANNING',
  'TASK_PLANNING',
  'DECISION_SUPPORT',
  'BUSINESS_COMPLAINT',
  'WORKFLOW_REQUEST',
  // Compatibility Aliases
  'CHAT',
  'QUESTION',
  'CONTENT_GENERATION',
  'CODE',
  'STUDY_GUIDANCE',
  'PLAN',
  'WORKFLOW',
  'TASK',
  'REPLAN',
  'BUSINESS_TRIAGE',
  'DOCUMENT_ANALYSIS',
  'EMERGENCY_GUIDANCE'
]);

const suggestedActionSchema = z.object({
  type: z.enum(['CREATE_PLAN', 'TRIGGER_WORKFLOW', 'EXPLAIN_MORE', 'GENERATE_DOC', 'CODE_DEMO', 'CUSTOM_PROMPT']),
  label: z.string(),
  prompt: z.string(),
  category: z.string().optional(),
  targetDays: z.number().optional(),
  dailyHours: z.number().optional()
});

const generalChatResponseSchema = z.object({
  mode: z.string(),
  intent: z.string().optional(),
  message: z.string().min(1, 'Response message is required'),
  title: z.string().optional(),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string()
  })).optional(),
  code: z.object({
    language: z.string(),
    snippet: z.string(),
    explanation: z.string().optional()
  }).optional(),
  citations: z.array(z.string()).optional().default([]),
  suggestedActions: z.array(suggestedActionSchema).optional().default([]),
  workflowRequired: z.boolean().default(false),
  metadata: z.record(z.any()).optional().default({})
});

module.exports = {
  chatRequestSchema,
  responseModeEnum,
  generalChatResponseSchema,
  suggestedActionSchema
};
