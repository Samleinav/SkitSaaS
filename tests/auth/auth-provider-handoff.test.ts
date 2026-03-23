import assert from 'node:assert/strict';
import test from 'node:test';
import { configureAuthRateLimit } from '../../lib/auth/rate-limit';
import { applyAuthProviderRateLimit } from '../../lib/auth/provider-handoff';

test('auth provider start handoff returns 429 when auth rate limit blocks the request', async () => {
  configureAuthRateLimit(async ({ action }) => ({
    limited: action === 'start',
    retryAfterSeconds: 17
  }));

  try {
    const response = await applyAuthProviderRateLimit(
      new Request('http://localhost/api/auth/providers/google/start'),
      'start'
    );

    assert.ok(response);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), '17');
    assert.deepEqual(await response.json(), {
      error: 'Too many requests. Please try again later.'
    });
  } finally {
    configureAuthRateLimit(async () => ({ limited: false }));
  }
});

test('auth provider callback handoff returns 429 when auth rate limit blocks the request', async () => {
  configureAuthRateLimit(async ({ action }) => ({
    limited: action === 'callback',
    retryAfterSeconds: 29
  }));

  try {
    const response = await applyAuthProviderRateLimit(
      new Request('http://localhost/api/auth/providers/google/callback'),
      'callback'
    );

    assert.ok(response);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), '29');
    assert.deepEqual(await response.json(), {
      error: 'Too many requests. Please try again later.'
    });
  } finally {
    configureAuthRateLimit(async () => ({ limited: false }));
  }
});
