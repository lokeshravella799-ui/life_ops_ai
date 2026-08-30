const { z } = require('zod');

const createGoalSchema = z.object({
  title: z.string().min(1, 'Title must be provided'),
  description: z.string().optional().default(''),
  category: z.enum([
    'CAREER',
    'STUDY',
    'PROJECT',
    'TRAVEL',
    'DECISION',
    'DOCUMENT',
    'BUSINESS',
    'PERSONAL',
    'HEALTH',
    'FINANCE',
    'FITNESS',
    'GENERAL'
  ]).optional().default('PERSONAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  targetDate: z.string().optional().nullable(),
  target_days: z.number().optional().nullable(),
  targetDays: z.number().optional().nullable(),
  daily_hours: z.number().optional().nullable(),
  dailyHours: z.number().optional().nullable(),
  constraints: z.array(z.string()).optional().default([]),
  autoOrchestrate: z.boolean().optional().default(false)
});

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum([
    'CAREER',
    'STUDY',
    'PROJECT',
    'TRAVEL',
    'DECISION',
    'DOCUMENT',
    'BUSINESS',
    'PERSONAL',
    'HEALTH',
    'FINANCE',
    'FITNESS',
    'GENERAL'
  ]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  targetDate: z.string().optional().nullable(),
  target_days: z.number().optional().nullable(),
  targetDays: z.number().optional().nullable(),
  daily_hours: z.number().optional().nullable(),
  dailyHours: z.number().optional().nullable(),
  constraints: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED', 'PAUSED']).optional()
});

module.exports = {
  createGoalSchema,
  updateGoalSchema
};
