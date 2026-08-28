const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const http = require('http');

let server;
let baseUrl;
let authToken;
let testUserId;
let createdWorkflowId;
let createdTaskId;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
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

test('1. Health Check Endpoint', async () => {
  const res = await request('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.status, 'HEALTHY');
});

test('2. User Registration & JWT Authentication', async () => {
  const email = `test_${Date.now()}@lifeops.ai`;
  const res = await request('/auth/register', {
    method: 'POST',
    body: {
      email,
      password: 'SecurePassword123!',
      fullName: 'Alex Architect',
      role: 'Engineer'
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.strictEqual(res.body.data.user.email, email);

  authToken = res.body.data.token;
  testUserId = res.body.data.user.id;
});

test('3. Auth Me & Profile Lookup', async () => {
  const res = await request('/auth/me');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.user.id, testUserId);
});

test('4. Add Memory / Context Preference', async () => {
  const res = await request('/memories', {
    method: 'POST',
    body: {
      category: 'STUDY_HABIT',
      keyTag: 'evening_focus',
      content: 'Can only study in 3-hour evening blocks after 6 PM.'
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.memory.id);
});

test('5. Primary Multi-Agent Goal Orchestration (10-Day DBMS Exam)', async () => {
  const res = await request('/workflows/orchestrate', {
    method: 'POST',
    body: {
      goalText: 'I have a DBMS exam in 10 days. I can study 3 hours every evening and I need to cover 5 units.',
      category: 'STUDY',
      targetDays: 10,
      dailyHours: 3
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.workflow);
  assert.ok(res.body.data.agents.length >= 5); // Orchestrator, Research, Planner, Decision, Execution, Verification
  assert.ok(res.body.data.tasks.length >= 8);

  createdWorkflowId = res.body.data.workflow.id;
  createdTaskId = res.body.data.tasks[0].id;

  // Check verification agent output
  assert.strictEqual(res.body.data.verification.status, 'VERIFIED');
});

test('6. Task Management: Mark Task Completed', async () => {
  const res = await request(`/tasks/${createdTaskId}`, {
    method: 'PATCH',
    body: {
      status: 'COMPLETED',
      notes: 'Finished Day 1 ER modeling and converted schemas.'
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.task.status, 'COMPLETED');
});

test('7. Adaptive Replanning WOW Feature ("I could not study yesterday")', async () => {
  const res = await request(`/workflows/${createdWorkflowId}/replan`, {
    method: 'POST',
    body: {
      disruptionReason: "I couldn't study yesterday (missed Day 2).",
      missedDays: 1,
      completedTaskIds: [createdTaskId]
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.revision);
  assert.ok(res.body.data.replanData.deltaSummary);
  assert.ok(res.body.data.replanData.changesMade.length > 0);
  assert.ok(res.body.data.tasks.length > 0);
});

test('8. Business Mode Demo: Customer Wrong Product & Refund Triage', async () => {
  const res = await request('/business/triage-complaint', {
    method: 'POST',
    body: {
      customerName: 'Sarah Connor',
      orderId: 'ORD-55421',
      issueText: 'A customer received the wrong product and wants a refund.',
      requestedResolution: 'Full Refund'
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.triageResult.ticketId);
  assert.strictEqual(res.body.data.triageResult.refundEligible, true);
  assert.ok(res.body.data.triageResult.draftCustomerResponse.length > 20);
  assert.ok(res.body.data.triageResult.internalActionTasks.length > 0);
});

test('9. Document Text Action Extraction', async () => {
  const res = await request('/documents/process-text', {
    method: 'POST',
    body: {
      title: 'DBMS Project Guidelines',
      rawContent: 'Final project submission deadline is Friday 5 PM. Must implement normalization, write 5 stored procedures, and test concurrency control with 2PL.'
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.extracted.extractedActionItems.length > 0);
});

test('10. Dashboard Stats & Live Agent Activity Feed', async () => {
  const res = await request('/activity/dashboard-stats');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.stats.totalGoals >= 1);
  assert.ok(res.body.data.stats.totalWorkflows >= 1);
  assert.ok(res.body.data.recentActivity.length > 0);
});
