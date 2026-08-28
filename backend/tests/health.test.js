const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let server;
let baseUrl;

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

test('Backend Health API returns HEALTHY status', async () => {
  const res = await fetch(`${baseUrl}/health`);
  const json = await res.json();
  
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.status, 'HEALTHY');
  assert.strictEqual(json.data.service, 'LifeOps AI Backend');
});
