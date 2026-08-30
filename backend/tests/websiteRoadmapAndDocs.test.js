const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

let server;
let baseUrl;
let authToken = '';
let userId = '';
let testGoalId = '';
let testDocId = '';

async function apiRequest(path, options = {}) {
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

test('1. Setup Authenticated User for Website Tests', async () => {
  const uniqueEmail = `webuser_${Date.now()}@lifeops.ai`;
  const res = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      email: uniqueEmail,
      password: 'Password123!',
      fullName: 'Web User'
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  authToken = res.body.data.token || res.body.data.session?.access_token || res.body.data.user.id;
  userId = res.body.data.user.id;
  assert.ok(authToken);
  assert.ok(userId);
});

test('2. AI Chat & Real-Time News Retrieval (POST /api/chat)', async () => {
  const res = await apiRequest('/chat', {
    method: 'POST',
    token: authToken,
    body: {
      message: "Today's news in Hyderabad"
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.message);
  assert.ok(res.body.data.message.length > 50);
  assert.strictEqual(typeof res.body.data.title, 'string');
});

test('3. AI Chat & Web Search Query (POST /api/chat)', async () => {
  const res = await apiRequest('/chat', {
    method: 'POST',
    token: authToken,
    body: {
      message: 'Search the web for Python tutorials'
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.message);
  assert.ok(Array.isArray(res.body.data.suggestedActions));
});

test('4. Goal Creation with Auto-Orchestration (AI Response -> Goal -> Workflow -> Roadmap)', async () => {
  const res = await apiRequest('/goals', {
    method: 'POST',
    token: authToken,
    body: {
      title: 'Master React & Node Full Stack Development',
      description: 'Complete 3 full-stack projects, master state management, and build REST APIs.',
      category: 'CAREER',
      priority: 'HIGH',
      target_days: 14,
      daily_hours: 3,
      autoOrchestrate: true
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.goal);
  assert.strictEqual(res.body.data.goal.title, 'Master React & Node Full Stack Development');
  assert.strictEqual(res.body.data.goal.priority, 'HIGH');
  assert.strictEqual(res.body.data.goal.target_days, 14);

  testGoalId = res.body.data.goal.id;
  assert.ok(testGoalId);

  if (res.body.data.workflow) {
    assert.ok(res.body.data.tasks.length > 0);
  }
});

test('5. Enriched Goals List (GET /api/goals) with real-time calculated progress', async () => {
  const res = await apiRequest('/goals', {
    method: 'GET',
    token: authToken
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.goals));
  const found = res.body.data.goals.find(g => g.id === testGoalId);
  assert.ok(found);
  assert.strictEqual(found.priority, 'HIGH');
  assert.strictEqual(typeof found.progress_percentage, 'number');
});

test('6. Goal Detail Retrieval (GET /api/goals/:id) with tasks, agents & progress metrics', async () => {
  const res = await apiRequest(`/goals/${testGoalId}`, {
    method: 'GET',
    token: authToken
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.goal);
  assert.strictEqual(res.body.data.goal.id, testGoalId);
  assert.ok(Array.isArray(res.body.data.tasks));
  assert.ok(res.body.data.progress);
  assert.strictEqual(typeof res.body.data.progress.percentage, 'number');
});

test('7. Workflow Lookup by Goal ID fallback (GET /api/workflows/:goalId)', async () => {
  const res = await apiRequest(`/workflows/${testGoalId}`, {
    method: 'GET',
    token: authToken
  });

  // Should seamlessly resolve the workflow without 404
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.workflow);
  assert.strictEqual(res.body.data.workflow.goal_id, testGoalId);
});

test('8. Explicit Generate Workflow on Demand (POST /api/goals/:id/generate-workflow)', async () => {
  const createRes = await apiRequest('/goals', {
    method: 'POST',
    token: authToken,
    body: {
      title: 'Learn Advanced System Design',
      description: 'Study microservices, caching, and rate limiting.',
      category: 'STUDY',
      priority: 'MEDIUM',
      target_days: 7,
      daily_hours: 2,
      autoOrchestrate: false
    }
  });

  assert.strictEqual(createRes.status, 201);
  const ungeneratedGoalId = createRes.body.data.goal.id;

  const genRes = await apiRequest(`/goals/${ungeneratedGoalId}/generate-workflow`, {
    method: 'POST',
    token: authToken
  });

  assert.strictEqual(genRes.status, 201);
  assert.strictEqual(genRes.body.success, true);
  assert.ok(genRes.body.data.workflow);
  assert.strictEqual(genRes.body.data.workflow.goal_id, ungeneratedGoalId);
  assert.ok(genRes.body.data.tasks.length > 0);
});

test('9. Task Creation, IN_PROGRESS and Status Toggling in Central Roadmap', async () => {
  const createRes = await apiRequest('/tasks', {
    method: 'POST',
    token: authToken,
    body: {
      title: 'Review System Design Primer Chapter 1',
      goal_id: testGoalId,
      priority: 'HIGH',
      day_number: 1,
      estimated_minutes: 45
    }
  });

  assert.strictEqual(createRes.status, 201);
  assert.strictEqual(createRes.body.success, true);
  const createdTaskId = createRes.body.data.task.id;
  assert.ok(createdTaskId);

  // Toggle task to IN_PROGRESS
  const inProgRes = await apiRequest(`/tasks/${createdTaskId}`, {
    method: 'PATCH',
    token: authToken,
    body: { status: 'IN_PROGRESS' }
  });
  assert.strictEqual(inProgRes.status, 200);
  assert.strictEqual(inProgRes.body.data.task.status, 'IN_PROGRESS');

  // Toggle task to COMPLETED
  const patchRes = await apiRequest(`/tasks/${createdTaskId}`, {
    method: 'PATCH',
    token: authToken,
    body: { status: 'COMPLETED' }
  });

  assert.strictEqual(patchRes.status, 200);
  assert.strictEqual(patchRes.body.data.task.status, 'COMPLETED');
});

test('10. Document AI Processing: Title & Content Extraction, Key Points, Storage & Retrieval', async () => {
  const sampleBrief = `Product Launch Deliverables:
1. Complete UI/UX redesign by Friday.
2. Deliver marketing landing page and sales pitch deck.
3. Conduct end-to-end security penetration audit by next month.`;

  const res = await apiRequest('/documents/process-text', {
    method: 'POST',
    token: authToken,
    body: {
      title: 'Product Launch Q4 Blueprint',
      rawContent: sampleBrief
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.document);
  assert.strictEqual(res.body.data.document.title, 'Product Launch Q4 Blueprint');
  assert.ok(res.body.data.extracted);
  assert.ok(res.body.data.extracted.summary);
  assert.ok(Array.isArray(res.body.data.extracted.keyPoints));
  assert.ok(Array.isArray(res.body.data.extracted.importantConcepts));
  assert.ok(Array.isArray(res.body.data.extracted.extractedActionItems));

  testDocId = res.body.data.document.id;
  assert.ok(testDocId);

  // Verify document in list
  const listRes = await apiRequest('/documents', {
    method: 'GET',
    token: authToken
  });

  assert.strictEqual(listRes.status, 200);
  assert.strictEqual(listRes.body.success, true);
  const foundDoc = listRes.body.data.documents.find(d => d.id === testDocId);
  assert.ok(foundDoc);
});

test('11. Document Deletion (DELETE /api/documents/:id)', async () => {
  const res = await apiRequest(`/documents/${testDocId}`, {
    method: 'DELETE',
    token: authToken
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);

  const listRes = await apiRequest('/documents', {
    method: 'GET',
    token: authToken
  });

  const foundDoc = listRes.body.data.documents.find(d => d.id === testDocId);
  assert.strictEqual(foundDoc, undefined);
});
