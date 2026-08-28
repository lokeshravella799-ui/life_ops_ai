const BaseAgent = require('./baseAgent');
const { decisionOutputSchema } = require('../validators/agentOutputSchemas');
const logger = require('../utils/logger');

class DecisionAgent extends BaseAgent {
  constructor() {
    super('Decision Agent', 'Trade-off Evaluation & Prioritization Optimization');
  }

  async evaluateAndPrioritize({ goalObjective, schedule = [], constraints = [] }) {
    const systemInstruction = `You are the Decision Agent in LifeOps AI.
Your role is to evaluate trade-offs, identify high-yield activities with maximum exam/outcome impact, determine task priorities (LOW, MEDIUM, HIGH, URGENT), and optimize workload distribution.

Respond strictly with a JSON object matching this schema:
{
  "prioritizationRationale": "Explanation of how priorities were assigned",
  "prioritizedTasks": [
    {
      "title": "Task Name matching the plan",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "rationale": "Why this priority was assigned"
    }
  ]
}`;

    const flatTasks = [];
    (schedule || []).forEach(day => {
      (day.tasks || []).forEach(t => {
        flatTasks.push({ day: day.day, title: t.title, description: t.description });
      });
    });

    const prompt = `Goal: "${goalObjective}"
Schedule Tasks: ${JSON.stringify(flatTasks)}
Constraints: ${JSON.stringify(constraints)}`;

    const fallbackGenerator = () => {
      const isTravel = /travel|trip|america|usa|japan|flight|visit/i.test(goalObjective);

      const prioritizedTasks = flatTasks.map(t => {
        let priority = 'MEDIUM';
        let rationale = 'Essential sequential milestone.';

        if (/visa|esta|passport|flight|booking/i.test(t.title)) {
          priority = 'URGENT';
          rationale = 'Critical hard prerequisite with long processing lead times.';
        } else if (/normalization|sql|concurrency|architecture|docker|redis|itinerary/i.test(t.title)) {
          priority = 'HIGH';
          rationale = 'High-impact core milestone directly driving the main objective.';
        } else if (/mock|pyq|simulation|departure|packing/i.test(t.title)) {
          priority = 'URGENT';
          rationale = 'Final verification and operational readiness prerequisite.';
        }

        return {
          title: t.title,
          priority,
          rationale
        };
      });

      return {
        prioritizationRationale: isTravel
          ? 'Elevated Visa applications and flight bookings to URGENT priority due to advance lead time requirements, followed by high-priority accommodation and city itinerary scheduling.'
          : 'Prioritized critical path deliverables and high-frequency analytical milestones while ensuring foundational coverage.',
        prioritizedTasks: prioritizedTasks.length > 0 ? prioritizedTasks : [{ title: 'Core Task', priority: 'HIGH', rationale: 'Core objective' }]
      };
    };

    return this.run({
      prompt,
      systemInstruction,
      schema: decisionOutputSchema,
      schemaName: 'DecisionOutput',
      fallbackGenerator
    });
  }
}

module.exports = new DecisionAgent();
