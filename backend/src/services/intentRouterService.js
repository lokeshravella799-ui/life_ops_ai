const { extractDestination, isUSATravel } = require('../utils/domainExtractor');
const logger = require('../utils/logger');

class IntentRouterService {
  /**
   * Classify user prompt into one of the 16 exact intents and determine if workflow orchestration is explicitly required
   */
  classifyIntent(message) {
    const text = (message || '').trim().toLowerCase();

    // 1. REPLAN / ADJUST EXISTING WORKFLOW
    if (/(missed|couldn't study|didn't study|replan|rearrange|adjust plan|change plan|behind schedule).*(yesterday|day \d+|today|schedule)/i.test(text)) {
      return {
        intent: 'WORKFLOW_REQUEST',
        mode: 'REPLAN',
        workflowRequired: true,
        category: 'STUDY'
      };
    }

    // 2. EXPLICIT MULTI-DAY PLANNING & ROADMAP REQUESTS (MODE B - Autonomous LifeOps)
    // Must contain explicit planning verbs + duration/timeframes or clear plan requests
    const isExplicitWorkflow =
      /(create|make|generate|build|give me)\s+.*?(\d+[\s-]*(day|week|month|hr)|full|detailed|milestone)?\s*.*?(plan|schedule|roadmap|curriculum|itinerary|sprint)\b/i.test(text) ||
      /\b(plan|plane|plann)\s+.*?\bfor\s+\d+\s*(days|weeks|months)/i.test(text) ||
      /\b(plan|plane|plann)\s+(my|a)?\s*(trip|travel|study|project|sprint|exam|learning|itinerary|vacation)\b/i.test(text) ||
      /\bcreate\s+tasks\s+for\b/i.test(text) ||
      /\bmake\s+me\s+a\s+schedule\b/i.test(text) ||
      /\bexam\s+in\s+\d+\s*days.*?(plan|schedule)/i.test(text) ||
      /\bhelp\s+me\s+organize\s+this\s+project\s+into\s+milestones\b/i.test(text) ||
      /\bcreate\s+tasks\s+for\s+launching\b/i.test(text);

    if (isExplicitWorkflow) {
      const isTravel = /travel|trip|flight|vacation|tour|itinerary|mumbai|goa|america|usa|japan|kyoto|paris|bali/i.test(text);
      const isStudy = /exam|study|dbms|subject|learn|course|semester|sql|algorithm|python/i.test(text);
      const isProject = /build|code|saas|app|microservice|redis|docker|project|sprint|website/i.test(text);

      let category = 'PERSONAL';
      let intent = 'GOAL_PLANNING';

      if (isTravel) {
        category = 'TRAVEL';
        intent = 'GOAL_PLANNING';
      } else if (isStudy) {
        category = 'STUDY';
        intent = 'GOAL_PLANNING';
      } else if (isProject) {
        category = 'PROJECT';
        intent = 'TASK_PLANNING';
      }

      const daysMatch = text.match(/(\d+)\s*[-]?\s*(days?|weeks?|months?)/i);
      let targetDays = isTravel ? 5 : isProject ? 7 : isStudy ? 10 : 7;
      if (daysMatch) {
        const val = parseInt(daysMatch[1], 10);
        if (/weeks?/i.test(daysMatch[2])) targetDays = val * 7;
        else if (/months?/i.test(daysMatch[2])) targetDays = val * 30;
        else targetDays = val;
      }

      return {
        intent,
        mode: 'PLAN',
        workflowRequired: true,
        category,
        targetDays,
        destination: isTravel ? extractDestination(message) : null
      };
    }

    // 3. TEXT_GENERATION (Writing emails, introductions, letters)
    if (/(write|draft|compose)\s+(a\s+|an\s+|the\s+)?(professional\s+|formal\s+|casual\s+)?(email|introduction|intro|cover letter|essay|message|letter)/i.test(text) ||
        /(write an email|asking my professor)/i.test(text)) {
      return {
        intent: 'TEXT_GENERATION',
        mode: 'TEXT_GENERATION',
        workflowRequired: false
      };
    }

    // 4. CODING (Code generation, functions, algorithms)
    if (/(write a (c\+\+|python|javascript|typescript|java|go|rust|sql|html|css)?\s*(program|code|function|script|query|algorithm)|implement|binary search|code for|write code)/i.test(text)) {
      return {
        intent: 'CODING',
        mode: 'CODE',
        workflowRequired: false
      };
    }

    // 5. SUMMARIZATION
    if (/^(summarize|tldr|give me a summary of|briefly summarize)/i.test(text)) {
      return {
        intent: 'SUMMARIZATION',
        mode: 'SUMMARIZATION',
        workflowRequired: false
      };
    }

    // 6. TRANSLATION
    if (/(translate|how do you say|in spanish|in french|in hindi|in german)/i.test(text)) {
      return {
        intent: 'TRANSLATION',
        mode: 'EXPLANATION',
        workflowRequired: false
      };
    }

    // 7. CALCULATION
    if (/\b(calculate|math|equation|arithmetic)\b|what is \d+[\s\+\-\*\/]|budget calculation|\bcompute\b/i.test(text)) {
      return {
        intent: 'CALCULATION',
        mode: 'CALCULATION',
        workflowRequired: false
      };
    }

    // 8. BRAINSTORMING
    if (/(brainstorm|give me ideas for|suggest topics for|creative ideas)/i.test(text)) {
      return {
        intent: 'BRAINSTORMING',
        mode: 'EXPLANATION',
        workflowRequired: false
      };
    }

    // 9. DOCUMENT_GENERATION (Explicit document synthesis without multi-day plan)
    if (/(generate notes|give me notes|notes on|write a report|create a resume|cheat sheet|generate a pdf|generate a docx)/i.test(text)) {
      return {
        intent: 'DOCUMENT_GENERATION',
        mode: 'CONTENT_GENERATION',
        workflowRequired: false
      };
    }

    // 10. BUSINESS_COMPLAINT / TRIAGE
    if (/(customer|refund|wrong product|complaint|damaged item|order #|support ticket|client issue)/i.test(text)) {
      return {
        intent: 'BUSINESS_COMPLAINT',
        mode: 'BUSINESS_TRIAGE',
        workflowRequired: false,
        category: 'BUSINESS'
      };
    }

    // 11. TRAVEL_QUERY (Informational travel queries without plan requests e.g. "tell me about mumbai", "best places in goa")
    if (/(travel|trip|flight|visit|destination|mumbai|goa|america|japan|paris|tourist|sightseeing)/i.test(text)) {
      return {
        intent: 'TRAVEL_QUERY',
        mode: 'STUDY_GUIDANCE',
        workflowRequired: false,
        category: 'TRAVEL',
        destination: extractDestination(message)
      };
    }

    // 12. STUDY_QUERY (Learning guidance, how to learn, concepts without multi-day plans)
    if (/(how (can|should|do) i (learn|study|master|start|prepare)|how to learn|learning path for|what should i focus on)/i.test(text)) {
      return {
        intent: 'STUDY_QUERY',
        mode: 'STUDY_GUIDANCE',
        workflowRequired: false,
        category: 'STUDY'
      };
    }

    // 13. EXPLANATION / GENERAL_QA
    if (/(what is|explain|how does|why does|difference between|compare|tell me about|define|who is)/i.test(text)) {
      return {
        intent: 'EXPLANATION',
        mode: 'EXPLANATION',
        workflowRequired: false
      };
    }

    // 14. DEFAULT GENERAL_QA (Conversational AI by default)
    return {
      intent: 'GENERAL_QA',
      mode: 'CHAT',
      workflowRequired: false
    };
  }
}

module.exports = new IntentRouterService();
