const test = require('node:test');
const assert = require('node:assert');
const BaseAgent = require('../src/agents/baseAgent');
const memoryAgent = require('../src/agents/memoryAgent');
const orchestratorAgent = require('../src/agents/orchestratorAgent');
const researchAgent = require('../src/agents/researchAgent');
const plannerAgent = require('../src/agents/plannerAgent');
const decisionAgent = require('../src/agents/decisionAgent');
const executionAgent = require('../src/agents/executionAgent');
const verificationAgent = require('../src/agents/verificationAgent');
const workflowEngine = require('../src/orchestrator/workflowEngine');
const db = require('../src/config/supabase');
const geminiService = require('../src/services/geminiService');

let testUserId;

test.before(async () => {
  const user = await db.createAuthUser(`agent_tester_${Date.now()}@lifeops.ai`, 'Pass12345!', {
    full_name: 'Agent Tester',
    role: 'Engineer'
  });
  testUserId = user.id;

  // Add sample memory
  await db.createMemory({
    user_id: testUserId,
    category: 'STUDY_HABIT',
    key_tag: 'evening_hours',
    content: 'Prefers 3-hour study blocks in the evening.'
  });
});

test('1. BaseAgent Standardized Execution Wrapper', async () => {
  const testAgent = new BaseAgent('Test Agent', 'Diagnostics');
  const res = await testAgent.run({
    prompt: 'Echo test',
    fallbackGenerator: () => ({ testPassed: true })
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.status, 'COMPLETED');
  assert.ok(res.executionTimeMs >= 0);
  assert.strictEqual(res.data.testPassed, true);
});

test('2. MemoryAgent Context Retrieval', async () => {
  const res = await memoryAgent.getContextForUser(testUserId);
  assert.strictEqual(res.success, true);
  assert.ok(res.data.relevantMemories.length >= 1);
  assert.ok(res.data.relevantMemories.some(m => m.key === 'evening_hours'));
});

test('3. OrchestratorAgent Goal Analysis & Dynamic Agent Selection', async () => {
  const res = await orchestratorAgent.analyzeGoal('Prepare for DBMS exam in 10 days with 3 hours daily');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.category, 'STUDY');
  assert.strictEqual(res.data.timelineDays, 10);
  assert.ok(res.data.requiredAgents.includes('RESEARCH'));
  assert.ok(res.data.requiredAgents.includes('PLANNER'));
  assert.ok(res.data.requiredAgents.includes('DECISION'));
  assert.ok(res.data.requiredAgents.includes('EXECUTION'));
  assert.ok(res.data.requiredAgents.includes('VERIFICATION'));
});

test('4. ResearchAgent Domain Extraction & Fact/Assumption Separation', async () => {
  const res = await researchAgent.conductResearch('Prepare for DBMS exam in 10 days', 'STUDY', ['10 days', '3 hours/day']);
  assert.strictEqual(res.success, true);
  assert.ok(res.data.keyTopics.length >= 3);
  assert.ok(res.data.facts.length >= 1);
  assert.ok(res.data.assumptions.length >= 1);
  assert.ok(res.data.risks.length >= 1);
  assert.ok(res.data.recommendations.length >= 1);
});

test('5. PlannerAgent Multi-Day Milestone Scheduling & Task Dependencies', async () => {
  const res = await plannerAgent.createPlan({
    goalObjective: 'Prepare for DBMS exam',
    totalDays: 10,
    dailyHours: 3,
    researchFindings: { keyTopics: ['ER Model', 'SQL', 'Normalization'] }
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.schedule.length, 10);
  assert.strictEqual(res.data.schedule[0].day, 1);
  assert.ok(res.data.schedule[0].tasks.length >= 1);
  assert.ok(res.data.schedule[1].tasks[0].dependencies.length >= 1);
});

test('6. DecisionAgent Trade-off Evaluation & Priority Tiers', async () => {
  const sampleSchedule = [
    { day: 1, theme: 'Foundations', tasks: [{ title: 'ER Modeling' }] },
    { day: 2, theme: 'Relational', tasks: [{ title: 'Relational Algebra' }] },
    { day: 3, theme: 'Advanced', tasks: [{ title: 'Normalization 3NF and BCNF' }] }
  ];

  const res = await decisionAgent.evaluateAndPrioritize({
    goalObjective: 'Prepare for DBMS exam',
    schedule: sampleSchedule,
    constraints: ['3 hours/day']
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.data.prioritizedTasks.length >= 3);
  const normalizationTask = res.data.prioritizedTasks.find(t => t.title.includes('Normalization'));
  assert.ok(normalizationTask);
  assert.strictEqual(normalizationTask.priority, 'HIGH');
});

test('7. ExecutionAgent Task Entity Synthesis & Safety Boundaries', async () => {
  const sampleSchedule = [
    { day: 1, theme: 'Foundations', tasks: [{ title: 'ER Modeling', estimatedMinutes: 180, dependencies: [] }] },
    { day: 2, theme: 'SQL', tasks: [{ title: 'SQL Queries', estimatedMinutes: 180, dependencies: ['ER Modeling'] }] }
  ];

  const taskPriorities = [
    { title: 'ER Modeling', priority: 'MEDIUM' },
    { title: 'SQL Queries', priority: 'HIGH' }
  ];

  const res = await executionAgent.synthesizeTasks({
    goalObjective: 'DBMS Study Plan',
    schedule: sampleSchedule,
    taskPriorities
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.executableTasks.length, 2);
  assert.strictEqual(res.data.executableTasks[0].dayNumber, 1);
  assert.strictEqual(res.data.executableTasks[1].priority, 'HIGH');
});

test('8. VerificationAgent Completeness & Feasibility Audit', async () => {
  const executableTasks = [
    { title: 'Task 1', dayNumber: 1, priority: 'MEDIUM' },
    { title: 'Task 2', dayNumber: 2, priority: 'HIGH' }
  ];

  const res = await verificationAgent.verifyWorkflow({
    goalObjective: 'DBMS Exam',
    constraints: ['10 days'],
    researchOutput: { keyTopics: ['Unit 1', 'Unit 2'] },
    plannerOutput: { schedule: [{ day: 1 }, { day: 2 }] },
    executableTasks
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.status, 'VERIFIED');
  assert.ok(res.data.score >= 80);
});

test('9. Full Dynamic WorkflowEngine Execution End-to-End', async () => {
  const result = await workflowEngine.orchestrateGoal({
    userId: testUserId,
    goalText: 'I have a DBMS exam in 10 days. I can study 3 hours every evening and I need to cover 5 units.',
    category: 'STUDY',
    targetDays: 10,
    dailyHours: 3
  });

  assert.ok(result.goal);
  assert.ok(result.workflow);
  assert.strictEqual(result.workflow.status, 'COMPLETED');
  assert.strictEqual(result.workflow.verification_status, 'VERIFIED');

  // Verify all agent traces were persisted to workflow_agents
  assert.ok(result.agents.length >= 5);
  const agentNames = result.agents.map(a => a.agent_name);
  assert.ok(agentNames.includes('Orchestrator Agent'));
  assert.ok(agentNames.includes('Research Agent'));
  assert.ok(agentNames.includes('Planner Agent'));
  assert.ok(agentNames.includes('Decision Agent'));
  assert.ok(agentNames.includes('Execution Agent'));
  assert.ok(agentNames.includes('Verification Agent'));

  // Verify tasks were persisted
  assert.strictEqual(result.tasks.length, 10);
  assert.strictEqual(result.tasks[0].status, 'TODO');
});

test('10. Dynamic Agent Graph Adaptation for Simple Goals', async () => {
  const result = await workflowEngine.orchestrateGoal({
    userId: testUserId,
    goalText: 'Organize room and establish a 30-minute daily reading habit',
    category: 'PERSONAL'
  });

  assert.ok(result.workflow);
  const agentNames = result.agents.map(a => a.agent_name);
  assert.ok(agentNames.includes('Orchestrator Agent'));
  assert.ok(agentNames.includes('Planner Agent'));
  assert.ok(agentNames.includes('Execution Agent'));
});
