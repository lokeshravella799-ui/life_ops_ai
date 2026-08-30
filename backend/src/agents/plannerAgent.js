const BaseAgent = require('./baseAgent');
const { plannerOutputSchema } = require('../validators/agentOutputSchemas');
const logger = require('../utils/logger');

class PlannerAgent extends BaseAgent {
  constructor() {
    super('Planner Agent', 'Milestone Scheduling & Task Dependency Graphing');
  }

  async createPlan({ goalObjective, totalDays = 10, dailyHours = 3, researchFindings = {} }) {
    const targetDays = Number(totalDays) || 14;
    const hours = Number(dailyHours) || 3;
    const minutesPerDay = hours * 60;

    const systemInstruction = `You are the Planner Agent in LifeOps AI.
Your responsibility is to convert a user's goal into a structured multi-day timeline covering ALL ${targetDays} requested days.
Break down topics into manageable daily tasks, assign estimated durations (in minutes, fitting daily limit), identify prerequisites, and establish dependencies.

Respond strictly with a JSON object matching this schema:
{
  "totalDays": ${targetDays},
  "totalEstimatedHours": ${(targetDays * minutesPerDay) / 60},
  "schedule": [
    {
      "day": 1,
      "theme": "Phase / Module Name",
      "tasks": [
        {
          "title": "Clear concise task name",
          "description": "Specific activities and exercises to accomplish",
          "estimatedMinutes": ${minutesPerDay},
          "dependencies": []
        }
      ]
    }
  ]
}`;

    const prompt = `Goal: "${goalObjective}"
Available Days: ${targetDays} (You MUST schedule all ${targetDays} days)
Daily Study/Work Hours: ${hours}
Research Topics: ${JSON.stringify(researchFindings.keyTopics || [])}
Recommendations: ${JSON.stringify(researchFindings.recommendations || [])}`;

    const generateCompleteSchedule = () => {
      const isTravel = /travel|trip|america|usa|japan|flight|visit|vacation|tour|itinerary/i.test(goalObjective);
      const isProject = /build|code|saas|app|microservice|redis|docker|software|api|portfolio/i.test(goalObjective);
      const isDBMS = /dbms|database|sql/i.test(goalObjective);

      let schedule = [];

      if (targetDays <= 10 && isTravel) {
        const { extractDestination, isUSATravel } = require('../utils/domainExtractor');
        const dest = extractDestination(goalObjective);
        const isUSA = isUSATravel(goalObjective);

        if (isUSA) {
          const travelItems = [
            { theme: 'Documentation & Visa Applications', title: 'US Visa (DS-160 / ESTA) Application & Document Preparation', desc: 'Complete DS-160 online form or submit ESTA authorization. Prepare passport and financial statements.' },
            { theme: 'Flight Route Analysis & Booking', title: 'Compare International Flights & Lock Baggage Allowance', desc: 'Analyze round-trip flight options to key hubs and book optimal travel windows.' },
            { theme: 'City Itinerary Selection', title: 'Map Intercity Routes (East Coast NYC/DC or West Coast California)', desc: 'Select major destination cities and intercity transit options.' },
            { theme: 'Accommodation Reservations', title: 'Book Central Accommodations near Transit Hubs', desc: 'Reserve vetted stays within walking distance to subway/transit lines.' },
            { theme: 'Attractions & Sightseeing Passes', title: 'Reserve Major Landmark Tickets & CityPasses', desc: 'Pre-book timed-entry passes for major landmarks and tours.' },
            { theme: 'Connectivity & Financial Setup', title: 'Arrange US eSIM Data & Zero-Forex Travel Cards', desc: 'Purchase unlimited US eSIM data plan and configure international travel alerts.' },
            { theme: 'Health, Safety & Insurance', title: 'Purchase Comprehensive Travel Medical Insurance', desc: 'Secure travel health insurance covering emergency medical care and flight cancellations.' },
            { theme: 'Daily Hourly Itinerary Blueprint', title: 'Finalize Day-by-Day Hourly Sightseeing & Dining Map', desc: 'Map out morning, afternoon, and evening walking routes and transit timings.' },
            { theme: 'Packing & Gear Checklist', title: 'Pack Seasonal Essentials, Adapters & Travel Gear', desc: 'Pack Type A/B power adapters, walking shoes, weather layers, and luggage.' },
            { theme: 'Final Departure Readiness Audit', title: 'Complete Pre-Departure Checklist & Offline Document Backups', desc: 'Download offline Google Maps, print boarding passes, hotel vouchers, and emergency contacts.' }
          ];

          schedule = travelItems.slice(0, targetDays).map((item, idx) => ({
            day: idx + 1,
            theme: item.theme,
            tasks: [{
              title: item.title,
              description: item.desc,
              estimatedMinutes: minutesPerDay,
              dependencies: idx > 0 ? [travelItems[idx - 1].title] : []
            }]
          }));
        } else {
          for (let i = 1; i <= targetDays; i++) {
            schedule.push({
              day: i,
              theme: `Day ${i}: ${dest} Exploration & Logistics`,
              tasks: [{
                title: `Day ${i}: Sightseeing, Transit & Activities in ${dest}`,
                description: `Explore key landmarks, cultural sites, culinary spots, and manage daily travel logistics in ${dest}.`,
                estimatedMinutes: minutesPerDay,
                dependencies: i > 1 ? [`Day ${i - 1}: Sightseeing, Transit & Activities in ${dest}`] : []
              }]
            });
          }
        }
      } else {
        // Multi-phase timeline generator covering ANY duration up to 90+ days
        const phaseNames = [
          'Foundations, Setup & Core Architecture',
          'Data Modeling, Schemas & Core Implementation',
          'Intermediate Modules & Component Development',
          'Advanced Topics, Caching, Queues & Distributed Patterns',
          'Real-World Case Studies & High-Scale Scenarios',
          'Performance Tuning, Profiling & Security Hardening',
          'Comprehensive Mock Drills, Review & Verification',
          'Final Capstone Deliverable & Mastery Assessment'
        ];

        for (let d = 1; d <= targetDays; d++) {
          const phaseIndex = Math.min(Math.floor(((d - 1) / targetDays) * phaseNames.length), phaseNames.length - 1);
          const currentPhaseName = phaseNames[phaseIndex];

          let taskTitle = '';
          let taskDesc = '';

          if (d === 1) {
            taskTitle = `Day 1: Orientation, Setup & Baseline for ${goalObjective.slice(0, 45)}`;
            taskDesc = 'Configure study/project environment, collect reference materials, and establish milestone tracking.';
          } else if (d === targetDays) {
            taskTitle = `Day ${targetDays}: Final Capstone Verification & Mastery Assessment`;
            taskDesc = 'Execute final full-scope audit, verify all deliverables against quality constraints, and synthesize completion summary.';
          } else {
            taskTitle = `Day ${d}: ${currentPhaseName} - Milestone ${d}`;
            taskDesc = `Complete core syllabus topics and exercises for Day ${d} of "${goalObjective.slice(0, 40)}". Practice implementation and review notes.`;
          }

          schedule.push({
            day: d,
            theme: `Phase ${phaseIndex + 1}: ${currentPhaseName}`,
            tasks: [
              {
                title: taskTitle,
                description: taskDesc,
                estimatedMinutes: minutesPerDay,
                dependencies: d > 1 ? [`Day ${d - 1}`] : []
              }
            ]
          });
        }
      }

      return {
        totalDays: schedule.length,
        totalEstimatedHours: (schedule.length * minutesPerDay) / 60,
        schedule
      };
    };

    const runResult = await this.run({
      prompt,
      systemInstruction,
      schema: plannerOutputSchema,
      schemaName: 'PlannerOutput',
      fallbackGenerator: generateCompleteSchedule
    });

    // Ensure the output schedule genuinely covers all `targetDays`
    if (runResult.success && runResult.data) {
      let rawSchedule = runResult.data.schedule || [];

      if (rawSchedule.length < targetDays) {
        logger.info(`🔄 [PlannerAgent] Expanding schedule from ${rawSchedule.length} to full ${targetDays} days.`);
        const complete = generateCompleteSchedule();
        runResult.data.schedule = complete.schedule;
        runResult.data.totalDays = targetDays;
        runResult.data.totalEstimatedHours = (targetDays * minutesPerDay) / 60;
      } else if (rawSchedule.length > targetDays) {
        runResult.data.schedule = rawSchedule.slice(0, targetDays);
        runResult.data.totalDays = targetDays;
        runResult.data.totalEstimatedHours = (targetDays * minutesPerDay) / 60;
      }
    }

    return runResult;
  }
}

module.exports = new PlannerAgent();
