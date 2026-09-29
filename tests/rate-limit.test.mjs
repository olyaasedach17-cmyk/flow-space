import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceRateLimit } from '../api/_firebaseAdmin.mjs';

test('rate limiter rejects requests after the configured user quota', () => {
  const key = `test:${Date.now()}:limited`;
  enforceRateLimit({ key, limit: 2, windowMs: 60_000 });
  enforceRateLimit({ key, limit: 2, windowMs: 60_000 });
  assert.throws(
    () => enforceRateLimit({ key, limit: 2, windowMs: 60_000 }),
    (error) => error.statusCode === 429 && error.retryAfter > 0,
  );
});

test('rate limiter keeps independent quotas for different users', () => {
  const key = `test:${Date.now()}:user-a`;
  enforceRateLimit({ key, limit: 1, windowMs: 60_000 });
  assert.doesNotThrow(() => enforceRateLimit({ key: `${key}:user-b`, limit: 1, windowMs: 60_000 }));
});
