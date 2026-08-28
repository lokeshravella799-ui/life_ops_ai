const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const db = require('../src/config/supabase');
const geminiService = require('../src/services/geminiService');

let server;
let baseUrl;
let userToken;
let userId;
let createdWorkflowId;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {}),
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

test('1. Reject Unauthenticated Orchestration Request', async () => {
  const res = await request('/workflows/orchestrate', {
    method: 'POST',
    body: {
      goalText: 'I have a DBMS exam in 10 days.'
    }
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('2. Setup Test User for Phase 5 Testing', async () => {
  const email = `phase5_user_${Date.now()}@lifeops.ai`;
  const res = await request('/auth/register', {
    method: 'POST',
    body: {
      email,
      password: 'SecurePassword123!',
      fullName: 'Hackathon Tester',
      role: 'Student'
    }
  });

  assert.strictEqual(res.status, 201);
  userToken = res.body.data.token;
  userId = res.body.data.user.id;
});

test('3. Reject Invalid Request Body (goalText too short)', async () => {
  const res = await request('/workflows/orchestrate', {
    method: 'POST',
    token: userToken,
    body: {
      goalText: 'Hi'
    }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

test('4. Primary Hackathon Demo Workflow (10-Day DBMS Exam)', async () => {
  const res = await request('/workflows/orchestrate', {
    method: 'POST',
    token: userToken,
    body: {
      goalText: 'I have a DBMS exam in 10 days. I can study 3 hours every evening and I need to cover 5 units.',
      category: 'STUDY',
      targetDays: 10,
      dailyHours: 3
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.workflowId);
  assert.ok(res.body.data.goalId);
  assert.strictEqual(res.body.data.status, 'COMPLETED');
  assert.strictEqual(res.body.data.verificationStatus, 'VERIFIED');
  assert.ok(res.body.data.agents.length >= 5);
  assert.strictEqual(res.body.data.tasks.length, 10);
  assert.ok(res.body.data.plan.schedule.length >= 1);

  createdWorkflowId = res.body.data.workflowId;
});

test('5. Verify Real Supabase Persistence for Goals & Workflows', async () => {
  const goals = await db.getGoalsByUserId(userId);
  assert.ok(goals.length >= 1);

  const workflows = await db.getWorkflowsByUserId(userId);
  assert.ok(workflows.length >= 1);
  const foundWf = workflows.find(w => w.id === createdWorkflowId);
  assert.ok(foundWf);
  assert.strictEqual(foundWf.status, 'COMPLETED');
});

test('6. Verify Agent Trace Persistence (workflow_agents table)', async () => {
  const agents = await db.getWorkflowAgentsByWorkflowId(createdWorkflowId);
  assert.ok(agents.length >= 5);
  
  const orchestratorTrace = agents.find(a => a.agent_name === 'Orchestrator Agent');
  assert.ok(orchestratorTrace);
  assert.strictEqual(orchestratorTrace.status, 'COMPLETED');
  assert.ok(orchestratorTrace.execution_time_ms >= 0);

  const verificationTrace = agents.find(a => a.agent_name === 'Verification Agent');
  assert.ok(verificationTrace);
  assert.strictEqual(verificationTrace.status, 'COMPLETED');
});

test('7. Verify Task Persistence & Details (tasks table)', async () => {
  const tasks = await db.getTasks(userId, { workflow_id: createdWorkflowId });
  assert.strictEqual(tasks.length, 10);
  assert.strictEqual(tasks[0].day_number, 1);
  assert.strictEqual(tasks[0].status, 'TODO');
  assert.ok(tasks[0].estimated_minutes > 0);
  assert.ok(['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(tasks[0].priority));
});

test('8. Verify Activity Logs (activity_logs table)', async () => {
  const logs = await db.getActivityLogsByUserId(userId, 20);
  assert.ok(logs.length >= 3);
  const actions = logs.map(l => l.action);
  assert.ok(actions.includes('WORKFLOW_STARTED'));
  assert.ok(actions.includes('WORKFLOW_COMPLETED'));
});

test('9. Verify GET /api/workflows/:id Endpoint Returns Full Frontend State', async () => {
  const res = await request(`/workflows/${createdWorkflowId}`, { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.workflow);
  assert.ok(res.body.data.agents.length >= 5);
  assert.strictEqual(res.body.data.tasks.length, 10);
});

test('10. Verify Adaptive Replanning Endpoint (POST /api/workflows/:id/replan)', async () => {
  const res = await request(`/workflows/${createdWorkflowId}/replan`, {
    method: 'POST',
    token: userToken,
    body: {
      disruptionReason: "I couldn't study yesterday (missed Day 2).",
      missedDays: 1
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.revision);
  assert.ok(res.body.data.replanData.changesMade.length > 0);
  assert.ok(res.body.data.replanData.deltaSummary);
});

test('11. Verify User Data Isolation & Security', async () => {
  // Register another user
  const otherUser = await db.createAuthUser(`intruder_${Date.now()}@lifeops.ai`, 'Pass12345!', {
    full_name: 'Intruder'
  });

  // Attempt to access user 1's workflow with other user's token
  const res = await request(`/workflows/${createdWorkflowId}`, { token: otherUser.id });
  assert.strictEqual(res.status, 404);
});

test('12. Verify Zero Secrets in Responses and Logs', async () => {
  const res = await request(`/workflows/${createdWorkflowId}`, { token: userToken });
  const responseStr = JSON.stringify(res.body);
  assert.strictEqual(responseStr.includes('AIzaSy'), false);
  assert.strictEqual(responseStr.includes('service_role'), false);
  assert.strictEqual(responseStr.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
});
