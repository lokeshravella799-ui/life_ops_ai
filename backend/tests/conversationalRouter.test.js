const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const intentRouterService = require('../src/services/intentRouterService');
const chatService = require('../src/services/chatService');
const workflowEngine = require('../src/orchestrator/workflowEngine');
const db = require('../src/config/supabase');

let server;
let baseUrl;

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const json = await response.json();
  return { status: response.status, body: json };
}

test.before(async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

// ==============================================================================
// 1. INTENT CLASSIFICATION UNIT TESTS
// ==============================================================================

test('TEST 1: "What is Generative AI?" -> GENERAL_QA (No Workflow, No Planner)', () => {
  const result = intentRouterService.classifyIntent('What is Generative AI?');
  assert.strictEqual(result.intent, 'EXPLANATION');
  assert.strictEqual(result.workflowRequired, false);
});

test('TEST 2: "Explain DBMS normalization." -> EXPLANATION (No DBMS study plan)', () => {
  const result = intentRouterService.classifyIntent('Explain DBMS normalization.');
  assert.strictEqual(result.intent, 'EXPLANATION');
  assert.strictEqual(result.workflowRequired, false);
});

test('TEST 3: "How do I learn Generative AI?" -> STUDY_QUERY (No automatic workflow)', () => {
  const result = intentRouterService.classifyIntent('How do I learn Generative AI?');
  assert.strictEqual(result.intent, 'STUDY_QUERY');
  assert.strictEqual(result.workflowRequired, false);
});

test('TEST 4: "Create a 30-day plan to learn Generative AI." -> GOAL_PLANNING (Workflow Mode Activated)', () => {
  const result = intentRouterService.classifyIntent('Create a 30-day plan to learn Generative AI.');
  assert.strictEqual(result.intent, 'GOAL_PLANNING');
  assert.strictEqual(result.mode, 'PLAN');
  assert.strictEqual(result.workflowRequired, true);
  assert.strictEqual(result.targetDays, 30);
});

test('TEST 5: "Plan a trip to Mumbai." -> GOAL_PLANNING (Destination = Mumbai, NO USA/ESTA/DS-160)', async () => {
  const result = intentRouterService.classifyIntent('Plan a trip to Mumbai.');
  assert.strictEqual(result.intent, 'GOAL_PLANNING');
  assert.strictEqual(result.mode, 'PLAN');
  assert.strictEqual(result.workflowRequired, true);
  assert.strictEqual(result.destination, 'Mumbai');

  // Verify full workflow execution produces NO US ESTA / DS-160 contamination
  const user = await db.createAuthUser('mumbai_traveler@lifeops.ai', 'Password123!', { full_name: 'Mumbai Traveler' });
  const workflowRes = await workflowEngine.orchestrateGoal({
    userId: user.id,
    goalText: 'Plan a trip to Mumbai for 5 days',
    category: 'TRAVEL',
    targetDays: 5,
    dailyHours: 3
  });

  assert.strictEqual(workflowRes.status, 'COMPLETED');
  const taskTitles = (workflowRes.tasks || []).map(t => `${t.title} ${t.description}`).join(' ');
  
  // Must NOT contain US-specific references
  assert.strictEqual(/US Visa|DS-160|ESTA|Statue of Liberty/i.test(taskTitles), false);
  assert.ok(taskTitles.includes('Mumbai'));
});

test('TEST 6: "Plan a trip to America." -> GOAL_PLANNING (Destination = United States, US info allowed)', () => {
  const result = intentRouterService.classifyIntent('Plan a trip to America.');
  assert.strictEqual(result.intent, 'GOAL_PLANNING');
  assert.strictEqual(result.mode, 'PLAN');
  assert.strictEqual(result.workflowRequired, true);
  assert.strictEqual(result.destination, 'United States');
});

test('TEST 7: "Write a professional email asking my professor for an extension." -> TEXT_GENERATION (No Workflow)', () => {
  const result = intentRouterService.classifyIntent('Write a professional email asking my professor for an extension.');
  assert.strictEqual(result.intent, 'TEXT_GENERATION');
  assert.strictEqual(result.workflowRequired, false);
});

test('TEST 8: "I missed my study day. Replan my remaining DBMS schedule." -> WORKFLOW_REQUEST (REPLAN)', () => {
  const result = intentRouterService.classifyIntent('I missed my study day. Replan my remaining DBMS schedule.');
  assert.strictEqual(result.intent, 'WORKFLOW_REQUEST');
  assert.strictEqual(result.mode, 'REPLAN');
  assert.strictEqual(result.workflowRequired, true);
});

// ==============================================================================
// 2. CONVERSATIONAL ENDPOINT (POST /api/chat) VERIFICATION
// ==============================================================================

test('POST /api/chat: Conversational response for "What is Generative AI?" has ZERO roadmap clutter', async () => {
  const res = await apiRequest('/chat', {
    method: 'POST',
    body: { message: 'What is Generative AI?' }
  });

  assert.strictEqual(res.status, 200);
  const data = res.body.data;
  assert.strictEqual(data.workflowRequired, false);
  assert.ok(data.message.includes('Generative AI'));
  assert.strictEqual(data.message.includes('Day 1'), false);
  assert.strictEqual(data.message.includes('Milestone Roadmap'), false);
  assert.ok(data.suggestedActions.some(a => a.type === 'CREATE_PLAN'));
});

test('POST /api/chat: "Write an email to my professor" generates clean email text without tasks', async () => {
  const res = await apiRequest('/chat', {
    method: 'POST',
    body: { message: 'Write a professional email asking my professor for an extension' }
  });

  assert.strictEqual(res.status, 200);
  const data = res.body.data;
  assert.strictEqual(data.intent, 'TEXT_GENERATION');
  assert.strictEqual(data.workflowRequired, false);
  assert.ok(data.message.includes('Dear Professor'));
});
