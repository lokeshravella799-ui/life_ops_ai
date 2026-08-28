const BaseAgent = require('./baseAgent');
const { orchestratorOutputSchema } = require('../validators/agentOutputSchemas');
const logger = require('../utils/logger');

class OrchestratorAgent extends BaseAgent {
  constructor() {
    super('Orchestrator Agent', 'Goal Understanding, Capability Mapping & Dynamic Agent/Tool Selection');
  }

  async analyzeGoal(goalText, userMemories = [], categoryHint = 'PERSONAL') {
    const systemInstruction = `You are the Lead Orchestrator Agent in LifeOps AI.
Your role is to understand user goals deeply, extract timelines, time constraints, and requirements.
You MUST dynamically determine BOTH:
1. Which specialized agents are necessary (Do NOT force every goal through every agent).
   Agents available: RESEARCH, PLANNER, DECISION, EXECUTION, VERIFICATION
2. Which action tools are necessary for real artifact generation and execution.
   Tools available:
   - WEB_RESEARCH: Verified public information, visa rules, and technical reference synthesis
   - CALCULATOR: Budget breakdowns, timeline capacity, currency calculations
   - PDF_GENERATOR: Verified PDF study plans, blueprints, itineraries, checklists
   - DOCX_GENERATOR: Formatted Word documents, resumes, assignments, research reports
   - SPREADSHEET_GENERATOR: Excel workbooks, budget allocations, schedules
   - MARKDOWN_GENERATOR: Markdown/text cheatsheets and documentation
   - CHECKLIST_GENERATOR: Categorized actionable execution checklists
   - EMAIL_DRAFT_GENERATOR: Professional customer/management email drafts
   - MESSAGE_DRAFT_GENERATOR: Concise Slack/Teams/WhatsApp messages
   - CALENDAR_DRAFT_GENERATOR: Calendar time-blocked study/work sessions
   - REMINDER_RECOMMENDATION: Notification reminders
   - DOCUMENT_ANALYSIS: Deep structural analysis of meeting notes, syllabus, requirements

Respond strictly with a JSON object matching this schema:
{
  "objective": "Concise summary of the user's specific goal",
  "category": "STUDY" | "PROJECT" | "TRAVEL" | "DECISION" | "DOCUMENT" | "BUSINESS" | "PERSONAL",
  "timeline": number or null (e.g. 10 for 10 days),
  "timelineDays": number or null,
  "constraints": ["Constraint 1", "Constraint 2"],
  "assumptions": ["Assumption 1", "Assumption 2"],
  "requiredAgents": ["RESEARCH", "PLANNER", "DECISION", "EXECUTION", "VERIFICATION"],
  "requiredTools": ["WEB_RESEARCH", "CALCULATOR", "PDF_GENERATOR", "CHECKLIST_GENERATOR"],
  "executionPlan": "High-level description of how selected agents and tools will coordinate"
}`;

    const prompt = `User Goal: "${goalText}"
Category Hint: ${categoryHint}
User Saved Context/Preferences: ${userMemories.length > 0 ? JSON.stringify(userMemories) : 'None'}`;

    const fallbackGenerator = () => {
      logger.info(`🔍 [Orchestrator Fallback] Dynamically analyzing prompt domain for: "${goalText}"`);
      const isTravel = /travel|trip|america|usa|japan|flight|visit|vacation|tour|itinerary/i.test(goalText);
      const isStudy = /exam|study|subject|dbms|course|test|learn|syllabus|semester/i.test(goalText);
      const isProject = /build|code|saas|app|microservice|redis|docker|software|api|portfolio/i.test(goalText);
      const isResume = /resume|cv|curriculum vitae|portfolio/i.test(goalText);
      const isAssignment = /assignment|homework|essay|report/i.test(goalText);
      const isBusiness = /refund|customer|complaint|ticket|sla|order/i.test(goalText);
      const isDocument = /meeting notes|transcript|analyze document|syllabus text/i.test(goalText);
      const isCalculation = /budget|calculate|cost|expense|rupees|dollar|currency/i.test(goalText);

      const daysMatch = goalText.match(/(\d+)\s*days?/i);
      const hoursMatch = goalText.match(/(\d+)\s*hours?/i);
      
      const timelineDays = daysMatch ? parseInt(daysMatch[1], 10) : (isTravel ? 14 : isProject ? 7 : isStudy ? 10 : 7);
      const dailyHoursLimit = hoursMatch ? parseInt(hoursMatch[1], 10) : 3;

      let category = 'PERSONAL';
      let requiredAgents = ['PLANNER', 'EXECUTION', 'VERIFICATION'];
      let requiredTools = ['CHECKLIST_GENERATOR', 'PDF_GENERATOR'];
      let objective = goalText;
      let constraints = [
        `Target timeline: ${timelineDays} days`,
        `Daily time allocation: ${dailyHoursLimit} hours/day`
      ];

      if (isTravel) {
        const { extractDestination, isUSATravel } = require('../utils/domainExtractor');
        const destination = extractDestination(goalText);
        category = 'TRAVEL';
        objective = `Plan comprehensive travel itinerary and logistics for ${destination}`;
        requiredAgents = ['RESEARCH', 'PLANNER', 'DECISION', 'EXECUTION', 'VERIFICATION'];
        requiredTools = ['WEB_RESEARCH', 'CALCULATOR', 'PDF_GENERATOR', 'CHECKLIST_GENERATOR'];
        if (isUSATravel(goalText)) {
          constraints.push('Account for US Visa/ESTA, international flights, accommodation, and city itineraries');
        } else {
          constraints.push(`Account for travel logistics, local transit, accommodation, and sightseeing in ${destination}`);
        }
      } else if (isResume) {
        category = 'PROJECT';
        objective = `Create a professional software developer resume`;
        requiredAgents = ['DECISION', 'EXECUTION', 'VERIFICATION'];
        requiredTools = ['DOCX_GENERATOR', 'PDF_GENERATOR'];
        constraints.push('Format strictly with modern ATS-compliant typography and high-impact action verbs');
      } else if (isAssignment) {
        category = 'STUDY';
        objective = `Create comprehensive academic assignment with solutions`;
        requiredAgents = ['RESEARCH', 'EXECUTION', 'VERIFICATION'];
        requiredTools = ['DOCX_GENERATOR', 'PDF_GENERATOR'];
      } else if (isBusiness) {
        category = 'BUSINESS';
        objective = `Triage customer complaint and process refund resolution`;
        requiredAgents = ['DECISION', 'EXECUTION', 'VERIFICATION'];
        requiredTools = ['EMAIL_DRAFT_GENERATOR', 'CHECKLIST_GENERATOR'];
      } else if (isDocument) {
        category = 'DOCUMENT';
        objective = `Analyze document text and extract deliverables`;
        requiredAgents = ['DECISION', 'EXECUTION', 'VERIFICATION'];
        requiredTools = ['DOCUMENT_ANALYSIS', 'CHECKLIST_GENERATOR'];
      } else if (isStudy) {
        category = 'STUDY';
        objective = goalText;
        requiredAgents = ['RESEARCH', 'PLANNER', 'DECISION', 'EXECUTION', 'VERIFICATION'];
        requiredTools = ['CHECKLIST_GENERATOR', 'PDF_GENERATOR', 'CALENDAR_DRAFT_GENERATOR'];
        constraints.push('Prioritize high weightage exam units and allocate buffer for simulation');
      } else if (isProject) {
        category = 'PROJECT';
        requiredAgents = ['RESEARCH', 'PLANNER', 'DECISION', 'EXECUTION', 'VERIFICATION'];
        requiredTools = ['CHECKLIST_GENERATOR', 'DOCX_GENERATOR', 'SPREADSHEET_GENERATOR'];
        constraints.push('Focus on working MVP deliverables and automated testing');
      } else if (isCalculation) {
        category = 'DECISION';
        requiredAgents = ['EXECUTION', 'VERIFICATION'];
        requiredTools = ['CALCULATOR', 'SPREADSHEET_GENERATOR'];
      }

      return {
        objective,
        category,
        timeline: timelineDays,
        timelineDays,
        constraints,
        assumptions: [
          'User is prepared to follow structured milestone breakdown',
          'Key baseline requirements and documentation are available'
        ],
        requiredAgents,
        requiredTools,
        executionPlan: `Orchestrating multi-agent fleet (${requiredAgents.join(' → ')}) with action tools (${requiredTools.join(', ')}) for: ${objective}.`
      };
    };

    return this.run({
      prompt,
      systemInstruction,
      schema: orchestratorOutputSchema,
      schemaName: 'OrchestratorOutput',
      fallbackGenerator
    });
  }
}

module.exports = new OrchestratorAgent();
