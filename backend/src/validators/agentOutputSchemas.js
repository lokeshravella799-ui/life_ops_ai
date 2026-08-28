const { z } = require('zod');

// Priority Enum
const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

// Verification Status Enum
const VerificationStatusEnum = z.enum(['VERIFIED', 'NEEDS_REVISION', 'FAILED']);

// ==============================================================================
// A. Orchestrator Output Schema
// ==============================================================================
const orchestratorOutputSchema = z.object({
  objective: z.string().min(1, 'Objective is required'),
  category: z.string().default('PERSONAL'),
  timeline: z.union([z.number(), z.string()]).optional().nullable(),
  timelineDays: z.number().optional().nullable(),
  constraints: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).optional().default([]),
  requiredAgents: z.array(z.string()).min(1, 'At least one agent must be selected'),
  requiredTools: z.array(z.string()).optional().default([]),
  executionPlan: z.string().min(1, 'Execution plan is required')
});

// ==============================================================================
// B. Memory Output Schema
// ==============================================================================
const memoryItemSchema = z.object({
  key: z.string(),
  content: z.string()
});

const memoryOutputSchema = z.object({
  relevantMemories: z.array(memoryItemSchema).default([])
});

// ==============================================================================
// C. Research Output Schema
// ==============================================================================
const researchOutputSchema = z.object({
  keyTopics: z.array(z.string()).min(1, 'Key topics are required'),
  facts: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([])
});

// ==============================================================================
// D. Planner Output Schema
// ==============================================================================
const plannerSubTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().default(''),
  estimatedMinutes: z.number().positive().default(60),
  dependencies: z.array(z.string()).default([])
});

const plannerDayScheduleSchema = z.object({
  day: z.number().int().positive(),
  theme: z.string().default('Milestone Phase'),
  tasks: z.array(plannerSubTaskSchema).min(1, 'At least one task per schedule day is required')
});

const plannerOutputSchema = z.object({
  totalDays: z.number().int().positive().optional(),
  totalEstimatedHours: z.number().positive().optional(),
  schedule: z.array(plannerDayScheduleSchema).min(1, 'Schedule cannot be empty')
});

// ==============================================================================
// E. Decision Output Schema
// ==============================================================================
const prioritizedTaskItemSchema = z.object({
  title: z.string(),
  priority: PriorityEnum,
  rationale: z.string().default('')
});

const decisionOutputSchema = z.object({
  prioritizationRationale: z.string().min(1, 'Prioritization rationale is required'),
  prioritizedTasks: z.array(prioritizedTaskItemSchema).min(1, 'Prioritized tasks are required')
});

// ==============================================================================
// F. Execution Output Schema
// ==============================================================================
const executableTaskItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  priority: PriorityEnum.default('MEDIUM'),
  dayNumber: z.number().int().positive().default(1),
  estimatedMinutes: z.number().positive().default(60),
  dueDate: z.string().optional().nullable(),
  dependencies: z.array(z.string()).default([])
});

const plannedActionItemSchema = z.object({
  actionId: z.string().optional(),
  description: z.string().optional(),
  tool: z.string(),
  input: z.record(z.any()).optional().default({}),
  requiresConfirmation: z.boolean().optional().default(false),
  status: z.string().optional().default('PENDING')
});

const executionOutputSchema = z.object({
  executableTasks: z.array(executableTaskItemSchema).min(1, 'Executable tasks cannot be empty'),
  actions: z.array(plannedActionItemSchema).optional().default([]),
  generatedArtifacts: z.array(z.record(z.any())).optional().default([]),
  executionSummary: z.string().optional().default('Tasks generated successfully')
});

// ==============================================================================
// G. Verification Output Schema
// ==============================================================================
const verificationOutputSchema = z.object({
  status: VerificationStatusEnum,
  score: z.number().min(0).max(100).default(90),
  feedback: z.string().min(1, 'Verification feedback is required'),
  verifiedArtifacts: z.array(z.record(z.any())).optional().default([]),
  missingItems: z.array(z.string()).default([])
});

// Helper Schemas for Replanning and Business Mode
const replanOutputSchema = z.object({
  disruptionSummary: z.string(),
  adjustmentStrategy: z.string(),
  oldPlanOverview: z.string(),
  newPlanOverview: z.string(),
  deltaSummary: z.string(),
  changesMade: z.array(z.string()).default([]),
  updatedTasks: z.array(executableTaskItemSchema)
});

const businessTriageOutputSchema = z.object({
  ticketId: z.string(),
  customerName: z.string(),
  issueClassification: z.string(),
  severity: PriorityEnum,
  refundEligible: z.boolean(),
  policyRationale: z.string(),
  recommendedResolution: z.string(),
  draftCustomerResponse: z.string(),
  internalActionTasks: z.array(z.object({
    title: z.string(),
    department: z.string(),
    priority: PriorityEnum,
    estimatedHours: z.number()
  }))
});

module.exports = {
  PriorityEnum,
  VerificationStatusEnum,
  orchestratorOutputSchema,
  memoryOutputSchema,
  researchOutputSchema,
  plannerOutputSchema,
  decisionOutputSchema,
  executionOutputSchema,
  verificationOutputSchema,
  replanOutputSchema,
  businessTriageOutputSchema
};
