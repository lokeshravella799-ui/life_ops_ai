const BaseAgent = require('./baseAgent');
const { executionOutputSchema } = require('../validators/agentOutputSchemas');
const toolExecutionService = require('../services/toolExecutionService');
const logger = require('../utils/logger');

class ExecutionAgent extends BaseAgent {
  constructor() {
    super('Execution Agent', 'Action Item Generation, Tool Orchestration & Database Entity Synthesis');
  }

  async synthesizeTasks({
    goalObjective,
    category = 'PERSONAL',
    schedule = [],
    taskPriorities = [],
    requiredTools = [],
    researchFindings = {},
    userId = 'system_user',
    workflowId = null
  }) {
    const systemInstruction = `You are the Execution Agent in LifeOps AI.
Your role is to:
1. Convert planned milestones and priority decisions into actionable database-ready task entities.
2. Formulate explicit Tool Action Plans using the selected required tools.
SAFETY & PERMISSION BOUNDARIES:
- Automatically executed actions: calculation, generating PDF/DOCX/XLSX artifacts, creating checklists, draft emails/messages.
- External actions requiring human confirmation: sending emails, financial transactions, deleting data.

Respond strictly with a JSON object matching this schema:
{
  "executableTasks": [
    {
      "title": "Task Title",
      "description": "Concrete action items and checklist",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "dayNumber": 1,
      "estimatedMinutes": 180,
      "dueDate": null,
      "dependencies": []
    }
  ],
  "actions": [
    {
      "actionId": "act_1",
      "description": "Action description",
      "tool": "TOOL_NAME",
      "input": {},
      "requiresConfirmation": false,
      "status": "PENDING"
    }
  ],
  "executionSummary": "Summary of generated tasks and tool actions"
}`;

    const prompt = `Goal: "${goalObjective}"
Category: "${category}"
Required Tools: ${JSON.stringify(requiredTools)}
Schedule: ${JSON.stringify(schedule)}
Priorities: ${JSON.stringify(taskPriorities)}`;

    const fallbackGenerator = () => {
      const priorityMap = new Map();
      (taskPriorities || []).forEach(p => priorityMap.set(p.title, p.priority));

      const executableTasks = [];

      (schedule || []).forEach(day => {
        (day.tasks || []).forEach(task => {
          executableTasks.push({
            title: task.title,
            description: task.description || 'Active milestone execution and deliverables creation.',
            priority: priorityMap.get(task.title) || 'MEDIUM',
            dayNumber: day.day,
            estimatedMinutes: task.estimatedMinutes || 180,
            dueDate: null,
            dependencies: task.dependencies || []
          });
        });
      });

      if (executableTasks.length === 0) {
        executableTasks.push({
          title: `Execute Core Action for ${goalObjective.slice(0, 50)}`,
          description: 'Deliver core goal specifications and artifacts.',
          priority: 'HIGH',
          dayNumber: 1,
          estimatedMinutes: 180,
          dueDate: null,
          dependencies: []
        });
      }

      // Generate action plan for registered tools
      const actions = [];
      const isTravel = /travel|trip|america|usa|japan/i.test(goalObjective) || category === 'TRAVEL';
      const isResume = /resume|cv|curriculum vitae/i.test(goalObjective);
      const isAssignment = /assignment|homework/i.test(goalObjective);
      const isCalculation = /budget|calculate|cost/i.test(goalObjective);
      const isBusiness = /refund|customer|complaint/i.test(goalObjective);

      // Web Research Tool Action
      if (requiredTools.includes('WEB_RESEARCH') || isTravel) {
        actions.push({
          actionId: 'act_web_res',
          description: `Synthesize authoritative guidelines for ${goalObjective}`,
          tool: 'WEB_RESEARCH',
          input: { query: goalObjective, maxResults: 4 },
          requiresConfirmation: false,
          status: 'READY'
        });
      }

      // Calculator Tool Action
      if (requiredTools.includes('CALCULATOR') || isTravel || isCalculation) {
        actions.push({
          actionId: 'act_calc',
          description: 'Compute categorized budget breakdown',
          tool: 'CALCULATOR',
          input: {
            operation: 'BUDGET_BREAKDOWN',
            totalAmount: isTravel ? 2500 : 1500,
            currency: isTravel ? 'USD' : 'USD'
          },
          requiresConfirmation: false,
          status: 'READY'
        });
      }

      // Checklist Tool Action
      if (requiredTools.includes('CHECKLIST_GENERATOR') || isTravel || isBusiness) {
        actions.push({
          actionId: 'act_chk',
          description: 'Generate actionable readiness checklist',
          tool: 'CHECKLIST_GENERATOR',
          input: {
            title: `${goalObjective.slice(0, 40)} Execution Checklist`,
            domain: category,
            categories: [
              {
                categoryName: 'Pre-Execution & Prerequisites',
                items: [
                  { task: 'Verify all required documentation and accounts', priority: 'HIGH', isCritical: true },
                  { task: 'Review timeline constraints and available hours', priority: 'MEDIUM', isCritical: false }
                ]
              },
              {
                categoryName: 'Core Milestone Deliverables',
                items: [
                  { task: 'Complete primary objective tasks according to roadmap', priority: 'HIGH', isCritical: true },
                  { task: 'Perform intermediate quality and safety verification', priority: 'MEDIUM', isCritical: false }
                ]
              }
            ]
          },
          requiresConfirmation: false,
          status: 'READY'
        });
      }

      // PDF Generator Action
      if (requiredTools.includes('PDF_GENERATOR') || isTravel || category === 'STUDY') {
        actions.push({
          actionId: 'act_pdf',
          description: 'Compile and generate verified PDF blueprint document',
          tool: 'PDF_GENERATOR',
          input: {
            title: `Execution Blueprint: ${goalObjective.slice(0, 40)}`,
            subtitle: `Autonomous multi-agent execution plan (${category})`,
            category,
            summary: `Verified execution blueprint structured across ${executableTasks.length} milestone tasks.`,
            sections: [
              {
                heading: '1. Strategic Roadmap & Milestones',
                items: executableTasks.slice(0, 6).map(t => `Day ${t.dayNumber} [${t.priority}]: ${t.title}`)
              },
              {
                heading: '2. Task Allocation Table',
                table: executableTasks.slice(0, 5).map(t => ({
                  col1: `Day ${t.dayNumber}`,
                  col2: t.title,
                  col3: `${t.estimatedMinutes}m • ${t.priority}`
                }))
              }
            ]
          },
          requiresConfirmation: false,
          status: 'READY'
        });
      }

      // DOCX Generator Action (for resumes, assignments, technical docs)
      if (requiredTools.includes('DOCX_GENERATOR') || isResume || isAssignment) {
        actions.push({
          actionId: 'act_docx',
          description: isResume ? 'Generate ATS-compliant Word Resume' : 'Generate formatted Word Assignment Document',
          tool: 'DOCX_GENERATOR',
          input: {
            title: isResume ? 'Alex Mercer - Senior Full Stack Software Engineer' : `Academic Assignment: ${goalObjective}`,
            subtitle: isResume ? 'San Francisco, CA | alex.mercer@email.com | github.com/alexmercer' : 'Course Assignment & Detailed Solutions',
            documentType: isResume ? 'RESUME' : 'ASSIGNMENT',
            summary: isResume ? 'Passionate Full Stack Engineer with 5+ years building scalable microservices, distributed architectures, and modern web applications.' : 'Comprehensive solutions covering core theoretical and practical exercises.',
            sections: isResume ? [
              {
                title: 'Technical Skills',
                bulletPoints: [
                  'Languages: JavaScript, TypeScript, Python, SQL, HTML5/CSS3',
                  'Frameworks: React, Next.js, Node.js, Express, Tailwind CSS',
                  'Databases & DevOps: PostgreSQL, Redis, Docker, Kubernetes, AWS'
                ]
              },
              {
                title: 'Professional Experience',
                subsections: [
                  {
                    subtitle: 'Senior Software Engineer | TechNova Solutions (2022 - Present)',
                    details: 'Architected scalable microservices supporting 2M+ active monthly users.',
                    bullets: [
                      'Engineered high-performance caching layer with Redis, reducing database latency by 65%.',
                      'Led multi-agent automation workflows resulting in 40% reduction in manual triage times.'
                    ]
                  }
                ]
              },
              {
                title: 'Education',
                content: 'B.S. in Computer Science | University of Technology (2018 - 2022)'
              }
            ] : [
              {
                title: 'Part 1: Conceptual Foundations',
                content: 'Detailed theoretical breakdown of relational models, schema constraints, and keys.'
              },
              {
                title: 'Part 2: Practical Query Solutions',
                bulletPoints: [
                  'Query 1: SELECT e.name, d.dept_name FROM employees e JOIN departments d ON e.dept_id = d.id;',
                  'Query 2: SELECT dept_id, AVG(salary) FROM employees GROUP BY dept_id HAVING COUNT(*) > 5;'
                ]
              }
            ]
          },
          requiresConfirmation: false,
          status: 'READY'
        });
      }

      // Spreadsheet Generator Action
      if (requiredTools.includes('SPREADSHEET_GENERATOR') || isCalculation) {
        actions.push({
          actionId: 'act_xlsx',
          description: 'Generate Excel budget and task tracking workbook',
          tool: 'SPREADSHEET_GENERATOR',
          input: {
            title: `${goalObjective.slice(0, 30)} Plan Tracker`,
            sheets: [
              {
                sheetName: 'Milestone Tasks',
                headers: ['Day', 'Task Title', 'Priority', 'Est. Minutes', 'Status'],
                rows: executableTasks.map(t => [t.dayNumber, t.title, t.priority, t.estimatedMinutes, 'TODO'])
              }
            ]
          },
          requiresConfirmation: false,
          status: 'READY'
        });
      }

      // Email Draft Action (for business/support)
      if (requiredTools.includes('EMAIL_DRAFT_GENERATOR') || isBusiness) {
        actions.push({
          actionId: 'act_email',
          description: 'Generate customer resolution email draft',
          tool: 'EMAIL_DRAFT_GENERATOR',
          input: {
            recipientType: 'CUSTOMER',
            recipientPlaceholder: 'Valued Customer',
            subject: 'Resolution for your Order Replacement & Refund Request',
            tone: 'EMPATHETIC',
            keyPoints: [
              'We have validated your order replacement ticket and apologize for the wrong SKU dispatch.',
              'A full refund has been credited and a prepaid return shipping label is attached.'
            ],
            proposedAction: 'Process refund and issue prepaid shipping label',
            attachmentsRequired: ['Prepaid_Return_Label.pdf']
          },
          requiresConfirmation: false,
          status: 'READY'
        });
      }

      return {
        executableTasks,
        actions,
        executionSummary: `Synthesized ${executableTasks.length} database task entities and queued ${actions.length} action tools.`
      };
    };

    // 1. Generate Structured Task Plan & Tool Actions
    const agentRunResult = await this.run({
      prompt,
      systemInstruction,
      schema: executionOutputSchema,
      schemaName: 'ExecutionOutput',
      fallbackGenerator
    });

    if (!agentRunResult.success) {
      return agentRunResult;
    }

    const taskPlan = agentRunResult.data;
    const generatedArtifacts = [];
    const executedActions = [];

    // 2. Perform Real Safe Tool Executions
    if (taskPlan.actions && taskPlan.actions.length > 0) {
      for (const act of taskPlan.actions) {
        try {
          const toolExecResult = await toolExecutionService.executeTool(act.tool, act.input, {
            userId,
            workflowId
          });

          if (toolExecResult.success && toolExecResult.artifacts?.length > 0) {
            generatedArtifacts.push(...toolExecResult.artifacts);
          }

          executedActions.push({
            ...act,
            status: toolExecResult.success ? (toolExecResult.requiresConfirmation ? 'PENDING_CONFIRMATION' : 'EXECUTED') : 'FAILED',
            result: toolExecResult.result || toolExecResult.safeMessage
          });
        } catch (toolErr) {
          logger.warn(`⚠️ [ExecutionAgent] Tool ${act.tool} execution error: ${toolErr.message}`);
          executedActions.push({
            ...act,
            status: 'FAILED',
            error: toolErr.message
          });
        }
      }
    }

    return {
      success: true,
      data: {
        executableTasks: taskPlan.executableTasks,
        actions: executedActions,
        generatedArtifacts,
        executionSummary: `Synthesized ${taskPlan.executableTasks.length} task entities and executed ${executedActions.length} action tools (${generatedArtifacts.length} real artifacts generated).`
      },
      executionTimeMs: agentRunResult.executionTimeMs,
      status: 'COMPLETED'
    };
  }
}

module.exports = new ExecutionAgent();
