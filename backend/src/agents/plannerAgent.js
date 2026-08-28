const BaseAgent = require('./baseAgent');
const { plannerOutputSchema } = require('../validators/agentOutputSchemas');
const logger = require('../utils/logger');

class PlannerAgent extends BaseAgent {
  constructor() {
    super('Planner Agent', 'Milestone Scheduling & Task Dependency Graphing');
  }

  async createPlan({ goalObjective, totalDays = 10, dailyHours = 3, researchFindings = {} }) {
    const systemInstruction = `You are the Planner Agent in LifeOps AI.
Your responsibility is to convert a user's goal into a structured multi-day or multi-phase timeline.
Break down topics into manageable tasks, assign estimated durations (in minutes, fitting the daily limit), identify prerequisites, and establish dependencies.

Respond strictly with a JSON object matching this schema:
{
  "totalDays": number,
  "totalEstimatedHours": number,
  "schedule": [
    {
      "day": 1,
      "theme": "Phase / Module Name",
      "tasks": [
        {
          "title": "Clear concise task name",
          "description": "Specific activities and exercises to accomplish",
          "estimatedMinutes": 180,
          "dependencies": []
        }
      ]
    }
  ]
}`;

    const prompt = `Goal: "${goalObjective}"
Available Days: ${totalDays}
Daily Study/Work Hours: ${dailyHours}
Research Topics: ${JSON.stringify(researchFindings.keyTopics || [])}
Recommendations: ${JSON.stringify(researchFindings.recommendations || [])}`;

    const fallbackGenerator = () => {
      const isTravel = /travel|trip|america|usa|japan|flight|visit|vacation|tour|itinerary/i.test(goalObjective);
      const isProject = /build|code|saas|app|microservice|redis|docker|software|api|portfolio/i.test(goalObjective);
      const isDBMS = /dbms|database|sql/i.test(goalObjective);

      const days = totalDays || (isTravel ? 10 : 10);
      const hours = dailyHours || 3;
      const minutesPerDay = hours * 60;

      let schedule = [];

      if (isTravel) {
        const { extractDestination, isUSATravel } = require('../utils/domainExtractor');
        const dest = extractDestination(goalObjective);
        const isUSA = isUSATravel(goalObjective);

        if (isUSA) {
          schedule = [
            {
              day: 1,
              theme: 'Documentation & Visa Applications',
              tasks: [
                {
                  title: 'US Visa (DS-160 / ESTA) Application & Document Preparation',
                  description: 'Complete DS-160 online form or submit ESTA authorization. Prepare passport, financial statements, and photograph specifications.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: []
                }
              ]
            },
            {
              day: 2,
              theme: 'Flight Route Analysis & Booking',
              tasks: [
                {
                  title: 'Compare International Flights & Lock Baggage Allowance',
                  description: 'Analyze round-trip flight options to key hubs (NYC/JFK or SFO/LAX) and book optimal travel windows.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: ['US Visa (DS-160 / ESTA) Application & Document Preparation']
                }
              ]
            },
            {
              day: 3,
              theme: 'City Itinerary Selection',
              tasks: [
                {
                  title: 'Map Intercity Routes (East Coast NYC/DC or West Coast California)',
                  description: 'Select major destination cities, intercity flights or Amtrak train bookings, and travel duration per city.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: ['Compare International Flights & Lock Baggage Allowance']
                }
              ]
            },
            {
              day: 4,
              theme: 'Accommodation Reservations',
              tasks: [
                {
                  title: 'Book Central Accommodations near Transit Hubs',
                  description: 'Reserve vetted hotels or Airbnb apartments within walking distance to subway/transit lines.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: ['Map Intercity Routes (East Coast NYC/DC or West Coast California)']
                }
              ]
            },
            {
              day: 5,
              theme: 'Attractions & Sightseeing Passes',
              tasks: [
                {
                  title: 'Reserve Major Landmark Tickets & CityPasses',
                  description: 'Pre-book timed-entry passes for major landmarks (e.g. Statue of Liberty, Empire State, Golden Gate tour).',
                  estimatedMinutes: minutesPerDay,
                  dependencies: ['Book Central Accommodations near Transit Hubs']
                }
              ]
            },
            {
              day: 6,
              theme: 'Connectivity & Financial Setup',
              tasks: [
                {
                  title: 'Arrange US eSIM Data & Zero-Forex Travel Cards',
                  description: 'Purchase unlimited US eSIM data plan and configure zero-forex credit/debit cards with international travel alerts.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: []
                }
              ]
            },
            {
              day: 7,
              theme: 'Health, Safety & Insurance',
              tasks: [
                {
                  title: 'Purchase Comprehensive Travel Medical Insurance',
                  description: 'Secure international travel health insurance covering emergency medical care, baggage loss, and flight cancellations.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: ['Compare International Flights & Lock Baggage Allowance']
                }
              ]
            },
            {
              day: 8,
              theme: 'Daily Hourly Itinerary Blueprint',
              tasks: [
                {
                  title: 'Finalize Day-by-Day Hourly Sightseeing & Dining Map',
                  description: 'Map out morning, afternoon, and evening walking routes, iconic restaurants, and transit timings.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: ['Reserve Major Landmark Tickets & CityPasses']
                }
              ]
            },
            {
              day: 9,
              theme: 'Packing & Gear Checklist',
              tasks: [
                {
                  title: 'Pack Seasonal Essentials, Adapters & Travel Gear',
                  description: 'Pack US-compatible power adapters (Type A/B 110V), comfortable walking shoes, weather layers, and TSA-approved locks.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: []
                }
              ]
            },
            {
              day: 10,
              theme: 'Final Departure Readiness Audit',
              tasks: [
                {
                  title: 'Complete Pre-Departure Checklist & Offline Document Backups',
                  description: 'Download offline Google Maps, print boarding passes, hotel vouchers, and emergency contact copies.',
                  estimatedMinutes: minutesPerDay,
                  dependencies: ['Finalize Day-by-Day Hourly Sightseeing & Dining Map', 'Pack Seasonal Essentials, Adapters & Travel Gear']
                }
              ]
            }
          ];
        } else {
          schedule = [
            {
              day: 1,
              theme: `Documentation & Entry Guidelines for ${dest}`,
              tasks: [
                {
                  title: `Verify Identification, Entry Guidelines & Bookings for ${dest}`,
                  description: `Check government ID/entry rules, passport validity if traveling internationally, and organize trip folder for ${dest}.`,
                  estimatedMinutes: minutesPerDay,
                  dependencies: []
                }
              ]
            },
            {
              day: 2,
              theme: `Transportation & Route Selection to ${dest}`,
              tasks: [
                {
                  title: `Book Flight, Train or Highway Transit to ${dest}`,
                  description: `Compare round-trip travel schedules and lock departure tickets to ${dest} with optimal arrival hours.`,
                  estimatedMinutes: minutesPerDay,
                  dependencies: [`Verify Identification, Entry Guidelines & Bookings for ${dest}`]
                }
              ]
            },
            {
              day: 3,
              theme: `Accommodation & Neighborhood Selection in ${dest}`,
              tasks: [
                {
                  title: `Book Central Accommodations in Key Neighborhoods of ${dest}`,
                  description: `Reserve vetted stays near transit hubs and primary sights in ${dest} to minimize daily commute times.`,
                  estimatedMinutes: minutesPerDay,
                  dependencies: [`Book Flight, Train or Highway Transit to ${dest}`]
                }
              ]
            },
            {
              day: 4,
              theme: `Top Landmarks & Sightseeing Passes in ${dest}`,
              tasks: [
                {
                  title: `Reserve Top Attractions, Heritage Sites & Experiences in ${dest}`,
                  description: `Pre-book entry tickets for key attractions, guided tours, and cultural experiences in ${dest}.`,
                  estimatedMinutes: minutesPerDay,
                  dependencies: [`Book Central Accommodations in Key Neighborhoods of ${dest}`]
                }
              ]
            },
            {
              day: 5,
              theme: `Local Food, Cultural Walks & Itinerary Blueprint for ${dest}`,
              tasks: [
                {
                  title: `Finalize Local Food Exploration & Day-by-Day Map for ${dest}`,
                  description: `Map out culinary stops, local markets, neighborhood walks, and pack travel essentials for ${dest}.`,
                  estimatedMinutes: minutesPerDay,
                  dependencies: [`Reserve Top Attractions, Heritage Sites & Experiences in ${dest}`]
                }
              ]
            }
          ];
        }
      } else if (isProject) {
        schedule = [
          {
            day: 1,
            theme: 'Architecture & API Contracts',
            tasks: [
              {
                title: 'Define Microservices Architecture & OpenAPI Schemas',
                description: 'Draft service boundaries (Auth, Core API, Worker) and PostgreSQL schema design.',
                estimatedMinutes: minutesPerDay,
                dependencies: []
              }
            ]
          },
          {
            day: 2,
            theme: 'Core Auth & User Service',
            tasks: [
              {
                title: 'Implement Auth Service & JWT Verification',
                description: 'Build user registration, token validation middleware, and unit test coverage.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Define Microservices Architecture & OpenAPI Schemas']
              }
            ]
          },
          {
            day: 3,
            theme: 'Core Business Logic Service',
            tasks: [
              {
                title: 'Develop Core Data Processing Endpoints',
                description: 'Implement CRUD operations, relational queries, and input validation schemas.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Implement Auth Service & JWT Verification']
              }
            ]
          },
          {
            day: 4,
            theme: 'Redis Caching & Queue Integration',
            tasks: [
              {
                title: 'Integrate Redis Cache & Background Job Queue',
                description: 'Set up Redis caching for frequent queries and BullMQ asynchronous workers.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Develop Core Data Processing Endpoints']
              }
            ]
          },
          {
            day: 5,
            theme: 'Dockerization & Compose Setup',
            tasks: [
              {
                title: 'Containerize Services with Docker & Compose',
                description: 'Write optimized multi-stage Dockerfiles and docker-compose orchestration.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Integrate Redis Cache & Background Job Queue']
              }
            ]
          },
          {
            day: 6,
            theme: 'Integration & Load Testing',
            tasks: [
              {
                title: 'Execute End-to-End Automated Integration Tests',
                description: 'Run integration test suite across containerized services and benchmark throughput.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Containerize Services with Docker & Compose']
              }
            ]
          },
          {
            day: 7,
            theme: 'Deployment & Documentation',
            tasks: [
              {
                title: 'Publish Deployment Blueprint & GitHub Documentation',
                description: 'Write clear README execution steps, API documentation, and architecture diagrams.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Execute End-to-End Automated Integration Tests']
              }
            ]
          }
        ];
      } else if (isDBMS) {
        schedule = [
          {
            day: 1,
            theme: 'Unit 1: Foundations & ER Modeling',
            tasks: [
              {
                title: 'ER Modeling & Relational Schema Mapping',
                description: 'Study entities, attributes, relationships, cardinality, and map ER diagrams into relational tables with primary and foreign keys.',
                estimatedMinutes: minutesPerDay,
                dependencies: []
              }
            ]
          },
          {
            day: 2,
            theme: 'Unit 1 & 2: Relational Math',
            tasks: [
              {
                title: 'Relational Algebra & Tuple Calculus',
                description: 'Master operations: Select, Project, Cartesian Product, Joins (Theta, Equi, Natural), Set Difference, and solve 10 conversion problems.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['ER Modeling & Relational Schema Mapping']
              }
            ]
          },
          {
            day: 3,
            theme: 'Unit 3: SQL Fundamentals',
            tasks: [
              {
                title: 'SQL DDL, DML & Basic Query Writing',
                description: 'Practice SELECT queries, aggregate functions, GROUP BY, HAVING, and constraints implementation.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Relational Algebra & Tuple Calculus']
              }
            ]
          },
          {
            day: 4,
            theme: 'Unit 3: Advanced SQL',
            tasks: [
              {
                title: 'Complex Nested Subqueries, Views & Triggers',
                description: 'Write correlated and non-correlated subqueries, implement updatable views, and construct database triggers.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['SQL DDL, DML & Basic Query Writing']
              }
            ]
          },
          {
            day: 5,
            theme: 'Unit 4: Functional Dependencies',
            tasks: [
              {
                title: 'Functional Dependencies & Attribute Closure',
                description: 'Compute attribute closures, determine candidate keys, and find minimal covers for relational schemas.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['ER Modeling & Relational Schema Mapping']
              }
            ]
          },
          {
            day: 6,
            theme: 'Unit 4: Normalization Proofs',
            tasks: [
              {
                title: 'Normalization (1NF to BCNF) & Decomposition',
                description: 'Decompose relations into 2NF, 3NF, BCNF. Verify Lossless Join property and Dependency Preservation.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Functional Dependencies & Attribute Closure']
              }
            ]
          },
          {
            day: 7,
            theme: 'Unit 5: Transactions & ACID',
            tasks: [
              {
                title: 'Transaction States & ACID Properties',
                description: 'Analyze Read/Write anomalies (Dirty read, Unrepeatable read, Lost update) and construct schedule precedence histories.',
                estimatedMinutes: minutesPerDay,
                dependencies: []
              }
            ]
          },
          {
            day: 8,
            theme: 'Unit 5: Concurrency & Indexing',
            tasks: [
              {
                title: 'Concurrency Control (2PL) & B+ Tree Indexing',
                description: 'Study Conflict Serializability, Strict 2PL locking protocol, Deadlock detection, and B+ tree search/insert calculations.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Transaction States & ACID Properties']
              }
            ]
          },
          {
            day: 9,
            theme: 'Exam Simulation',
            tasks: [
              {
                title: 'Full Length Previous Year Question Paper (PYQ)',
                description: 'Solve a full university exam paper under timed conditions and self-grade using official solution keys.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Normalization (1NF to BCNF) & Decomposition', 'Concurrency Control (2PL) & B+ Tree Indexing']
              }
            ]
          },
          {
            day: 10,
            theme: 'Final Synthesis & Formula Review',
            tasks: [
              {
                title: 'High-Yield Formula Review & Weak Spot Revision',
                description: 'Revise normalization decomposition cheat sheet, ACID rules, and relational algebra operator reference.',
                estimatedMinutes: minutesPerDay,
                dependencies: ['Full Length Previous Year Question Paper (PYQ)']
              }
            ]
          }
        ];
      } else {
        // Generic dynamic milestone schedule
        const total = Math.min(days, 10);
        for (let i = 1; i <= total; i++) {
          schedule.push({
            day: i,
            theme: `Milestone Phase ${i}`,
            tasks: [
              {
                title: `Phase ${i}: Execute Core Deliverable ${i} for ${goalObjective.slice(0, 40)}`,
                description: `Structured execution and review for milestone phase ${i}.`,
                estimatedMinutes: minutesPerDay,
                dependencies: i > 1 ? [`Phase ${i - 1}: Execute Core Deliverable ${i - 1} for ${goalObjective.slice(0, 40)}`] : []
              }
            ]
          });
        }
      }

      const adjustedSchedule = schedule.slice(0, Math.min(days, schedule.length));

      return {
        totalDays: adjustedSchedule.length,
        totalEstimatedHours: (adjustedSchedule.length * minutesPerDay) / 60,
        schedule: adjustedSchedule
      };
    };

    return this.run({
      prompt,
      systemInstruction,
      schema: plannerOutputSchema,
      schemaName: 'PlannerOutput',
      fallbackGenerator
    });
  }
}

module.exports = new PlannerAgent();
