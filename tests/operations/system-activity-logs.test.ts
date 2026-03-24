import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import {
  configureSysActivityLogWriter,
  createSysActivityLog
} from '../../lib/system/activity-logs';
import {
  normalizeSystemActivityEventCategory
} from '../../lib/system/activity-log-taxonomy';
import {
  getOrCreateRequestId,
  setResponseRequestIdHeader
} from '../../lib/observability/request-id';
import { executeProxyChain } from '../../lib/routing/proxies';

test('request ids stay stable per request object and can be attached to responses', () => {
  const request = new Request('https://example.test/admin/logs');

  const first = getOrCreateRequestId(request);
  const second = getOrCreateRequestId(request);

  assert.equal(first, second);
  assert.match(first, /^[0-9a-f-]{36}$/i);

  const response = setResponseRequestIdHeader(new Response('ok'), first);
  assert.equal(response.headers.get('x-request-id'), first);
});

test('executeProxyChain propagates a stable request id on pass-through and blocking responses', async () => {
  const request = new NextRequest('https://example.test/dashboard');

  const passThrough = await executeProxyChain(
    [async () => null],
    request
  );
  const passThroughRequestId = passThrough.headers.get('x-request-id');
  assert.ok(passThroughRequestId);

  const blocked = await executeProxyChain(
    [
      async () =>
        NextResponse.redirect(new URL('/login', request.url))
    ],
    request
  );

  assert.equal(blocked.headers.get('x-request-id'), passThroughRequestId);
});

test('createSysActivityLog writes normalized entries through the configured writer', async () => {
  const writes: Array<Record<string, unknown>> = [];
  configureSysActivityLogWriter(async (entry) => {
    writes.push(entry as Record<string, unknown>);
  });

  try {
    await createSysActivityLog({
      eventType: ' proxy.denied ',
      eventCategory: 'proxy',
      action: 'deny',
      status: 'warning',
      actorUserId: 7,
      source: ' /admin/users ',
      requestId: ' req-proxy-1 ',
      message: 'Blocked by proxy policy.',
      metadata: {
        reason: 'admin_required'
      }
    });

    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.eventType, 'proxy.denied');
    assert.equal(writes[0]?.eventCategory, 'proxy');
    assert.equal(writes[0]?.source, '/admin/users');
    assert.equal(writes[0]?.requestId, 'req-proxy-1');
    assert.equal(writes[0]?.status, 'warning');
    assert.equal(
      writes[0]?.metadata,
      JSON.stringify({ reason: 'admin_required' })
    );
  } finally {
    configureSysActivityLogWriter(null);
  }
});

test('system activity categories normalize to the canonical taxonomy', async () => {
  assert.equal(
    normalizeSystemActivityEventCategory('module-runtime'),
    'module_runtime'
  );
  assert.equal(
    normalizeSystemActivityEventCategory(' Proxy '),
    'proxy'
  );
  assert.equal(
    normalizeSystemActivityEventCategory('something-custom'),
    'system'
  );
});

test('createSysActivityLog fails open and leaves console evidence when the sink throws', async () => {
  const originalConsoleError = console.error;
  const calls: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };

  configureSysActivityLogWriter(async () => {
    throw new Error('sink_down');
  });

  try {
    await createSysActivityLog({
      eventType: 'auth.failed',
      requestId: 'req-auth-failed-1',
      source: '/login'
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.[0], 'Unable to persist system activity log:');
    const payload = calls[0]?.[1] as {
      eventType?: string;
      source?: string;
      requestId?: string;
      error?: unknown;
    };
    assert.equal(payload?.eventType, 'auth.failed');
    assert.equal(payload?.source, '/login');
    assert.equal(payload?.requestId, 'req-auth-failed-1');
    assert.ok(payload?.error instanceof Error);
  } finally {
    configureSysActivityLogWriter(null);
    console.error = originalConsoleError;
  }
});
