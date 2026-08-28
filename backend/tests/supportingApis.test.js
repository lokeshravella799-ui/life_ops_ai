const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const db = require('../src/config/supabase');

let server;
let baseUrl;
let userToken;
let userId;

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

test('Setup Authenticated User for Supporting APIs Tests', async () => {
  const email = `phase6_user_${Date.now()}@lifeops.ai`;
  const res = await request('/auth/register', {
    method: 'POST',
    body: {
      email,
      password: 'StrongPassword123!',
      fullName: 'Phase 6 Tester'
    }
  });

  assert.strictEqual(res.status, 201);
  userToken = res.body.data.token;
  userId = res.body.data.user.id;
});

// ==============================================================================
// 1. Goals CRUD
// ==============================================================================
let createdGoalId;

test('1. Goals CRUD: Create Goal (POST /api/goals)', async () => {
  const res = await request('/goals', {
    method: 'POST',
    token: userToken,
    body: {
      title: 'Master System Design & Microservices',
      description: 'Prepare for senior architectural interviews',
      category: 'PROJECT',
      targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      constraints: ['2 hours per day', 'Focus on distributed caching & idempotency']
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.goal.id);
  assert.strictEqual(res.body.data.goal.title, 'Master System Design & Microservices');
  createdGoalId = res.body.data.goal.id;
});

test('2. Goals CRUD: List Goals (GET /api/goals)', async () => {
  const res = await request('/goals', { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.goals.length >= 1);
});

test('3. Goals CRUD: Get Goal by ID (GET /api/goals/:id)', async () => {
  const res = await request(`/goals/${createdGoalId}`, { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.goal.id, createdGoalId);
});

test('4. Goals CRUD: Update Goal (PATCH /api/goals/:id)', async () => {
  const res = await request(`/goals/${createdGoalId}`, {
    method: 'PATCH',
    token: userToken,
    body: {
      title: 'Master Distributed Systems & High Scale Architectures',
      category: 'PROJECT'
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.goal.title, 'Master Distributed Systems & High Scale Architectures');
});

// ==============================================================================
// 2. Tasks CRUD
// ==============================================================================
let createdTaskId;

test('5. Tasks CRUD: Create Task (POST /api/tasks)', async () => {
  const res = await request('/tasks', {
    method: 'POST',
    token: userToken,
    body: {
      goalId: createdGoalId,
      title: 'Study Consistent Hashing and Virtual Nodes',
      description: 'Implement consistent hashing algorithm in node.js',
      priority: 'HIGH',
      dayNumber: 1,
      estimatedMinutes: 90
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.task.id);
  assert.strictEqual(res.body.data.task.title, 'Study Consistent Hashing and Virtual Nodes');
  createdTaskId = res.body.data.task.id;
});

test('6. Tasks CRUD: Get Task by ID with Dependencies (GET /api/tasks/:id)', async () => {
  const res = await request(`/tasks/${createdTaskId}`, { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.task.id, createdTaskId);
  assert.ok(Array.isArray(res.body.data.dependencies));
});

test('7. Tasks CRUD: Update Task Status & Activity Log (PATCH /api/tasks/:id)', async () => {
  const res = await request(`/tasks/${createdTaskId}`, {
    method: 'PATCH',
    token: userToken,
    body: {
      status: 'COMPLETED',
      notes: 'Completed implementation and tested node ring distributions.'
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.task.status, 'COMPLETED');
});

test('8. Tasks CRUD: Filter Tasks by Status (GET /api/tasks?status=COMPLETED)', async () => {
  const res = await request('/tasks?status=COMPLETED', { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.tasks.some(t => t.id === createdTaskId));
});

// ==============================================================================
// 3. Memories CRUD
// ==============================================================================
let createdMemoryId;

test('9. Memories CRUD: Create Memory Preference (POST /api/memories)', async () => {
  const res = await request('/memories', {
    method: 'POST',
    token: userToken,
    body: {
      category: 'STUDY_HABIT',
      keyTag: 'morning_focus',
      content: 'Most focused between 6 AM and 9 AM for deep work.'
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.memory.id);
  createdMemoryId = res.body.data.memory.id;
});

test('10. Memories CRUD: List Memories (GET /api/memories)', async () => {
  const res = await request('/memories', { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.memories.length >= 1);
});

test('11. Memories CRUD: Delete Memory (DELETE /api/memories/:id)', async () => {
  const res = await request(`/memories/${createdMemoryId}`, {
    method: 'DELETE',
    token: userToken
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
});

// ==============================================================================
// 4. Document Text Processing & Action Extraction
// ==============================================================================
test('12. Document Processing: Extract Actions from Meeting Notes (POST /api/documents/process-text)', async () => {
  const meetingNotes = `Q3 Engineering Roadmap Sync:
We need to migrate the authentication layer to Supabase Auth by next Friday.
Lokesh is responsible for finalizing the database schemas and Row Level Security policies.
All integration tests must achieve 100% pass rate before staging deployment on September 15.
Warehouse team must also prepare return labels for defect tickets.`;

  const res = await request('/documents/process-text', {
    method: 'POST',
    token: userToken,
    body: {
      title: 'Q3 Engineering Roadmap Sync Notes',
      rawContent: meetingNotes
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.document.id);
  assert.ok(res.body.data.extracted.summary);
  assert.ok(res.body.data.extracted.extractedActionItems.length >= 1);
});

test('13. Document Processing: List Processed Documents (GET /api/documents)', async () => {
  const res = await request('/documents', { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.documents.length >= 1);
});

// ==============================================================================
// 5. Business Complaint / Refund Triage Workflow
// ==============================================================================
test('14. Business Mode: Autonomous Customer Complaint Triage (POST /api/business/triage-complaint)', async () => {
  const res = await request('/business/triage-complaint', {
    method: 'POST',
    token: userToken,
    body: {
      customerName: 'Sarah Connor',
      orderId: 'ORD-77492',
      issueText: 'I ordered the Ergonomic Mechanical Keyboard Pro, but received a standard membrane keyboard instead. The package was sealed but the SKU inside does not match. I want an immediate refund or expedited exchange.',
      requestedResolution: 'Full Refund and Prepaid Return Label'
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  const triage = res.body.data.triageResult;
  assert.ok(triage.ticketId);
  assert.strictEqual(triage.refundEligible, true);
  assert.ok(triage.policyRationale);
  assert.ok(triage.draftCustomerResponse.length > 50);
  assert.ok(triage.internalActionTasks.length >= 1);
});

// ==============================================================================
// 6. Dashboard Stats & Activity Feed
// ==============================================================================
test('15. Dashboard Analytics & Real-Time Stats (GET /api/activity/dashboard-stats)', async () => {
  const res = await request('/activity/dashboard-stats', { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.stats);
  assert.ok(res.body.data.stats.totalGoals >= 1);
  assert.ok(res.body.data.stats.totalTasks >= 1);
  assert.ok(res.body.data.recentActivity.length >= 1);
});

test('16. Activity Logs Query (GET /api/activity?limit=10)', async () => {
  const res = await request('/activity?limit=10', { token: userToken });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.logs.length >= 1);
});

// ==============================================================================
// 7. Cleanup / Deletion Verification
// ==============================================================================
test('17. Goals CRUD: Delete Goal & Cascading Integrity (DELETE /api/goals/:id)', async () => {
  const res = await request(`/goals/${createdGoalId}`, {
    method: 'DELETE',
    token: userToken
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);

  // Confirm 404 after deletion
  const getRes = await request(`/goals/${createdGoalId}`, { token: userToken });
  assert.strictEqual(getRes.status, 404);
});
