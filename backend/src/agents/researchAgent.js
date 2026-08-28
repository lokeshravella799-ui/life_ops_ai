const BaseAgent = require('./baseAgent');
const { researchOutputSchema } = require('../validators/agentOutputSchemas');
const logger = require('../utils/logger');

class ResearchAgent extends BaseAgent {
  constructor() {
    super('Research Agent', 'Domain Knowledge Synthesis, Topic Decomposition & Risk Assessment');
  }

  async conductResearch(goalObjective, category = 'PERSONAL', constraints = []) {
    const systemInstruction = `You are the Research Agent in LifeOps AI.
Your role is to analyze the goal domain, identify necessary sub-topics, distinguish established facts from assumptions, identify potential roadblocks/risks, and formulate strategic recommendations.
IMPORTANT CONSTRAINT: You operate on domain knowledge, user context, and structured goal parameters. Do not claim to browse live external web URLs. Clearly distinguish facts from working assumptions.

Respond strictly with a JSON object matching this schema:
{
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3", ...],
  "facts": ["Fact 1", "Fact 2"],
  "assumptions": ["Assumption 1", "Assumption 2"],
  "risks": ["Risk 1", "Risk 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

    const prompt = `Goal: "${goalObjective}"
Category: "${category}"
Constraints: ${JSON.stringify(constraints)}`;

    const fallbackGenerator = () => {
      const isTravel = /travel|trip|america|usa|japan|flight|visit|vacation|tour|itinerary/i.test(goalObjective);
      const isDBMS = /dbms|database|sql/i.test(goalObjective);
      const isProject = /build|code|saas|app|microservice|redis|docker|software|api|portfolio/i.test(goalObjective);

      if (isTravel) {
        const { extractDestination, isUSATravel } = require('../utils/domainExtractor');
        const dest = extractDestination(goalObjective);
        const isUSA = isUSATravel(goalObjective);

        if (isUSA) {
          return {
            keyTopics: [
              'Phase 1: Visa & Documentation (US B1/B2 or ESTA, Passport validity > 6 months)',
              'Phase 2: Flight Bookings & Travel Insurance Coverage',
              'Phase 3: Route Selection (East Coast vs West Coast)',
              'Phase 4: Accommodation, Local Transit & SIM/eSIM Data',
              'Phase 5: Daily Sightseeing Itineraries & Landmark Reservations'
            ],
            facts: [
              'International travelers to the United States require a valid Visa or approved ESTA before boarding.',
              'US domestic travel across coasts spans multiple time zones and requires advance transit planning.'
            ],
            assumptions: [
              'User has a valid passport and basic travel budget established.',
              'Target trip duration is between 10 to 14 days.'
            ],
            risks: [
              'Visa processing appointment wait times can cause scheduling delays if not initiated early.',
              'Peak season flight and accommodation pricing fluctuations.'
            ],
            recommendations: [
              'Complete Visa/ESTA documentation at least 6 weeks before planned departure.',
              'Pre-book major attractions in advance.'
            ]
          };
        }

        return {
          keyTopics: [
            `Phase 1: Travel Logistics & Entry Requirements for ${dest}`,
            `Phase 2: Transportation & Flight/Train Booking to ${dest}`,
            `Phase 3: Accommodation & Neighborhood Selection in ${dest}`,
            `Phase 4: Top Sightseeing Highlights, Culture & Experiences in ${dest}`,
            `Phase 5: Local Cuisine, Shopping & Daily Itinerary Blueprint for ${dest}`
          ],
          facts: [
            `Planning travel to ${dest} requires selecting central accommodations to minimize local transit times.`,
            `Key attractions in ${dest} benefit from early morning or scheduled visits to avoid crowds.`
          ],
          assumptions: [
            `User is planning an optimized multi-day itinerary for ${dest}.`,
            'Standard travel safety guidelines and budget allocations apply.'
          ],
          risks: [
            'Peak tourist season pricing and local transit congestion during rush hours.',
            'Unplanned weather or seasonal closures of outdoor attractions.'
          ],
          recommendations: [
            `Reserve central accommodation in ${dest} at least 3 weeks before departure.`,
            `Group daily sightseeing activities by neighborhood within ${dest} to reduce commute times.`
          ]
        };
      }

      if (isProject) {
        return {
          keyTopics: [
            'Phase 1: System Architecture, API Contracts & Data Modeling',
            'Phase 2: Core Microservices Implementation (Auth, Worker, Gateway)',
            'Phase 3: Redis Caching Layer, Idempotency & Message Queues',
            'Phase 4: Containerization with Docker & Docker-Compose',
            'Phase 5: Automated Integration Tests & Cloud Deployment Blueprint'
          ],
          facts: [
            'Microservices require well-defined API boundaries and asynchronous event handling.',
            'Docker-compose simplifies local multi-container development and verification.'
          ],
          assumptions: [
            'Developer has working knowledge of Node.js, Express, and Docker basics.'
          ],
          risks: [
            'Scope creep across too many microservices can prevent MVP completion within the sprint.'
          ],
          recommendations: [
            'Keep MVP limited to 2-3 core microservices with clean Docker-compose deployment.'
          ]
        };
      }

      if (isDBMS) {
        return {
          keyTopics: [
            'Unit 1: ER Modeling, Schema Design & Keys (Primary, Foreign, Candidate)',
            'Unit 2: Relational Algebra (Select, Project, Joins) & Relational Calculus',
            'Unit 3: SQL DDL/DML, Complex Queries, Subqueries, Views & Triggers',
            'Unit 4: Functional Dependencies & Normalization (1NF, 2NF, 3NF, BCNF)',
            'Unit 5: Transactions, ACID Properties, Concurrency Control (2PL) & B+ Tree Indexing'
          ],
          facts: [
            'Standard university DBMS curricula allocate high exam weightage to Normalization and SQL queries.',
            'Transactions and Concurrency conflict serializability are frequent analytical problem areas.'
          ],
          assumptions: [
            'User has foundational understanding of basic data types and simple programming logic.'
          ],
          risks: [
            'Normalization decomposition proofs can consume excessive time if attribute closure fundamentals are not solid.'
          ],
          recommendations: [
            'Allocate 70% of study time to active query writing and problem decomposition.'
          ]
        };
      }

      return {
        keyTopics: [
          'Phase 1: Requirements Analysis & Prerequisite Discovery',
          'Phase 2: Structured Execution & Core Deliverables',
          'Phase 3: Deep Dive Practice & Refinement',
          'Phase 4: Final Synthesis & Review'
        ],
        facts: [
          'Milestone-based progressive decomposition yields higher completion rates than unstructured effort.'
        ],
        assumptions: [
          'User is dedicated to following the milestone schedule.'
        ],
        risks: [
          'Scope creep if daily milestones are not strictly timeboxed.'
        ],
        recommendations: [
          'Timebox daily sessions to the user-specified hours and review progress nightly.'
        ]
      };
    };

    return this.run({
      prompt,
      systemInstruction,
      schema: researchOutputSchema,
      schemaName: 'ResearchOutput',
      fallbackGenerator
    });
  }
}

module.exports = new ResearchAgent();
