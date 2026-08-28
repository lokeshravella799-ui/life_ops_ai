const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const db = require('../src/config/supabase');

let server;
let baseUrl;
let user1Token;
let user1Id;
let user1Email;
let user2Token;
let user2Id;

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

test('1. Register User 1 via Supabase Auth', async () => {
  user1Email = `user1_${Date.now()}@lifeops.ai`;
  const res = await request('/auth/register', {
    method: 'POST',
    body: {
      email: user1Email,
      password: 'StrongPassword123!',
      fullName: 'Alice Architect',
      role: 'Engineer'
    }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.strictEqual(res.body.data.user.email, user1Email);

  user1Token = res.body.data.token;
  user1Id = res.body.data.user.id;
});

test('2. Verify Profile Auto-Creation for User 1', async () => {
  const profile = await db.getProfileByUserId(user1Id);
  assert.ok(profile);
  assert.strictEqual(profile.full_name, 'Alice Architect');
  assert.strictEqual(profile.role, 'Engineer');
});

test('3. Login User 1 and Obtain Session Token', async () => {
  const res = await request('/auth/login', {
    method: 'POST',
    body: {
      email: user1Email,
      password: 'StrongPassword123!'
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.token);
});

test('4. Call /api/auth/me with Valid Token and Confirm Injected User ID', async () => {
  const res = await request('/auth/me', { token: user1Token });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.user.id, user1Id);
  assert.strictEqual(res.body.data.profile.full_name, 'Alice Architect');
});

test('5. Update Profile Preferences via Protected Route', async () => {
  const res = await request('/auth/profile', {
    method: 'PATCH',
    token: user1Token,
    body: {
      preferredStudyTime: 'Night (9 PM - 12 AM)'
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.profile.preferred_study_time, 'Night (9 PM - 12 AM)');
});

test('6. Reject Protected Endpoint Access Without Authentication', async () => {
  const res = await request('/auth/me'); // No token
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('7. Reject Protected Endpoint Access with Invalid Token', async () => {
  const res = await request('/goals', { token: 'invalid_malformed_token' });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('8. Multi-Tenancy & Data Isolation Between Users', async () => {
  // Register User 2
  const email2 = `user2_${Date.now()}@lifeops.ai`;
  const reg2 = await request('/auth/register', {
    method: 'POST',
    body: {
      email: email2,
      password: 'Password456!',
      fullName: 'Bob Builder',
      role: 'Developer'
    }
  });
  user2Token = reg2.body.data.token;
  user2Id = reg2.body.data.user.id;

  // User 1 creates a private goal
  const goalRes = await request('/goals', {
    method: 'POST',
    token: user1Token,
    body: {
      title: 'Alice Private Architecture Goal',
      description: 'Confidential system design roadmap',
      category: 'PROJECT'
    }
  });
  assert.strictEqual(goalRes.status, 201);
  const aliceGoalId = goalRes.body.data.goal.id;

  // User 2 lists goals — must NOT see Alice's goal
  const user2Goals = await request('/goals', { token: user2Token });
  assert.strictEqual(user2Goals.status, 200);
  const foundAliceGoalInUser2 = user2Goals.body.data.goals.some(g => g.id === aliceGoalId);
  assert.strictEqual(foundAliceGoalInUser2, false);

  // User 2 tries to directly fetch Alice's goal by ID — must be 404 NOT_FOUND
  const accessAttempt = await request(`/goals/${aliceGoalId}`, { token: user2Token });
  assert.strictEqual(accessAttempt.status, 404);
});
