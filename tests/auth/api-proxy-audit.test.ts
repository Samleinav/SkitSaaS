import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { proxyApiAdmin, proxyApiAuth } from '../../lib/routing/proxies';

test('API auth proxies emit audit logs when requests are denied before auth', async () => {
  const previousPostgresUrl = process.env.POSTGRES_URL;
  process.env.POSTGRES_URL = 'postgresql://local-test';

  const { configureSysActivityLogWriter } = await import('@/lib/system/activity-logs');
  const writes: Array<Record<string, unknown>> = [];
  configureSysActivityLogWriter(async (entry) => {
    writes.push(entry as Record<string, unknown>);
  });

  try {
    const dashboardResponse = await proxyApiAuth(
      new NextRequest('https://example.test/api/private/data')
    );
    const adminResponse = await proxyApiAdmin(
      new NextRequest('https://example.test/api/admin/users')
    );

    assert.equal(dashboardResponse?.status, 401);
    assert.equal(adminResponse?.status, 401);
    assert.equal(writes.length, 2);
    assert.equal(writes[0]?.eventType, 'auth.api.missing_cookie');
    assert.equal(writes[0]?.eventCategory, 'auth');
    assert.match(String(writes[0]?.requestId ?? ''), /^[0-9a-f-]{36}$/i);
    assert.equal(writes[1]?.eventType, 'auth.api.missing_cookie');
    assert.equal(writes[1]?.eventCategory, 'auth');
    assert.match(String(writes[1]?.requestId ?? ''), /^[0-9a-f-]{36}$/i);
  } finally {
    configureSysActivityLogWriter(null);
    if (previousPostgresUrl === undefined) {
      delete process.env.POSTGRES_URL;
    } else {
      process.env.POSTGRES_URL = previousPostgresUrl;
    }
  }
});
