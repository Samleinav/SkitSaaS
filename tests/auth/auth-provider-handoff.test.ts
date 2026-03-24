import assert from 'node:assert/strict';
import test from 'node:test';
import { configureAuthRateLimit } from '../../lib/auth/rate-limit';
import {
  applyAuthProviderRateLimit,
  attachAuthProviderHandoff,
  attachPreparedAuthProviderHandoff,
  clearAuthProviderHandoff,
  prepareAuthProviderHandoff,
  withAuthProviderStartState,
  validateAuthProviderHandoff
} from '../../lib/auth/provider-handoff';

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

test('attachAuthProviderHandoff issues a provider-scoped handoff cookie', async () => {
  process.env.AUTH_SECRET = 'test_auth_secret_provider_handoff';

  const response = await attachAuthProviderHandoff(new Response(null, { status: 302 }), {
    request: new Request('http://localhost/api/auth/providers/google/start'),
    providerId: 'google',
    now: Date.now()
  });

  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  assert.match(setCookie ?? '', /skitsaas_auth_provider_handoff=/);
  assert.match(setCookie ?? '', /Path=\/api\/auth\/providers\/google/);
  assert.match(setCookie ?? '', /HttpOnly/);
  assert.match(setCookie ?? '', /SameSite=Lax/);
});

test('validateAuthProviderHandoff accepts callback requests with a valid handoff cookie', async () => {
  process.env.AUTH_SECRET = 'test_auth_secret_provider_handoff';

  const startResponse = await attachAuthProviderHandoff(
    new Response(null, { status: 302 }),
    {
      request: new Request('http://localhost/api/auth/providers/google/start'),
      providerId: 'google',
      now: Date.now()
    }
  );

  const cookieHeader = startResponse.headers.get('set-cookie');
  assert.ok(cookieHeader);
  const cookieValue = (cookieHeader ?? '').split(';')[0] ?? '';

  const validated = await validateAuthProviderHandoff(
    new Request('http://localhost/api/auth/providers/google/callback?code=abc', {
      headers: {
        cookie: cookieValue
      }
    }),
    { providerId: 'google' }
  );

  assert.equal(validated.ok, true);
  if (validated.ok) {
    assert.equal(
      validated.request.headers.get('x-skitsaas-auth-provider-handoff-verified'),
      '1'
    );
    assert.ok(validated.request.headers.get('x-skitsaas-auth-provider-handoff-nonce'));
  }
});

test('prepared handoff exposes the same nonce for module start state and callback verification', async () => {
  process.env.AUTH_SECRET = 'test_auth_secret_provider_handoff';

  const handoff = await prepareAuthProviderHandoff({
    providerId: 'google',
    now: Date.now()
  });
  const startRequest = withAuthProviderStartState(
    new Request('http://localhost/api/auth/providers/google/start'),
    handoff.nonce
  );

  assert.equal(
    startRequest.headers.get('x-skitsaas-auth-provider-state'),
    handoff.nonce
  );

  const startResponse = await attachPreparedAuthProviderHandoff(
    new Response(null, { status: 302 }),
    {
      request: new Request('http://localhost/api/auth/providers/google/start'),
      handoff
    }
  );

  const cookieHeader = startResponse.headers.get('set-cookie');
  assert.ok(cookieHeader);
  const cookieValue = (cookieHeader ?? '').split(';')[0] ?? '';

  const validated = await validateAuthProviderHandoff(
    new Request('http://localhost/api/auth/providers/google/callback?code=abc', {
      headers: {
        cookie: cookieValue
      }
    }),
    { providerId: 'google' }
  );

  assert.equal(validated.ok, true);
  if (validated.ok) {
    assert.equal(validated.nonce, handoff.nonce);
  }
});

test('validateAuthProviderHandoff rejects provider mismatch and returns a clearing cookie', async () => {
  process.env.AUTH_SECRET = 'test_auth_secret_provider_handoff';

  const startResponse = await attachAuthProviderHandoff(
    new Response(null, { status: 302 }),
    {
      request: new Request('http://localhost/api/auth/providers/google/start'),
      providerId: 'google',
      now: Date.now()
    }
  );

  const cookieHeader = startResponse.headers.get('set-cookie');
  assert.ok(cookieHeader);
  const cookieValue = (cookieHeader ?? '').split(';')[0] ?? '';

  const validated = await validateAuthProviderHandoff(
    new Request('http://localhost/api/auth/providers/github/callback?code=abc', {
      headers: {
        cookie: cookieValue
      }
    }),
    { providerId: 'github' }
  );

  assert.equal(validated.ok, false);
  if (!validated.ok) {
    assert.equal(validated.response.status, 409);
    const clearedCookie = validated.response.headers.get('set-cookie');
    assert.ok(clearedCookie);
    assert.match(clearedCookie ?? '', /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
  }
});

test('clearAuthProviderHandoff appends an expired cookie header', async () => {
  const response = clearAuthProviderHandoff(
    new Response(null, { status: 200 }),
    'google'
  );
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  assert.match(setCookie ?? '', /Path=\/api\/auth\/providers\/google/);
  assert.match(setCookie ?? '', /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
});

test('validateAuthProviderHandoff rejects an expired handoff cookie', async () => {
  process.env.AUTH_SECRET = 'test_auth_secret_provider_handoff';

  const startResponse = await attachAuthProviderHandoff(
    new Response(null, { status: 302 }),
    {
      request: new Request('http://localhost/api/auth/providers/google/start'),
      providerId: 'google',
      now: Date.now() - 11 * 60 * 1000
    }
  );

  const cookieHeader = startResponse.headers.get('set-cookie');
  assert.ok(cookieHeader);
  const cookieValue = (cookieHeader ?? '').split(';')[0] ?? '';

  const validated = await validateAuthProviderHandoff(
    new Request('http://localhost/api/auth/providers/google/callback?code=abc', {
      headers: {
        cookie: cookieValue
      }
    }),
    { providerId: 'google' }
  );

  assert.equal(validated.ok, false);
  if (!validated.ok) {
    assert.equal(validated.response.status, 409);
    const clearedCookie = validated.response.headers.get('set-cookie');
    assert.ok(clearedCookie);
    assert.match(clearedCookie ?? '', /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
  }
});
