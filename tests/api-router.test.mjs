import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/[route].mjs';

function response() {
  return {
    statusCode: 200,
    body: null,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('bundled API router dispatches an existing route', async () => {
  const res = response();
  await handler({ method: 'GET', query: { route: 'images' } }, res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});

test('bundled API router returns 404 for an unknown route', async () => {
  const res = response();
  await handler({ method: 'GET', query: { route: 'missing' } }, res);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'API route not found' });
});
