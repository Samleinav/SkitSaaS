import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthAuditLog } from '../../lib/auth/audit';

test('createAuthAuditLog is best-effort when database logging is unavailable', async () => {
  const previousPostgresUrl = process.env.POSTGRES_URL;
  const previousAdminPostgresUrl = process.env.ADMIN_POSTGRES_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.ADMIN_POSTGRES_URL;

  try {
    await assert.doesNotReject(() =>
      createAuthAuditLog({
        eventType: 'auth.test',
        action: 'test',
        status: 'info',
        request: new Request('http://localhost/login', {
          headers: {
            'x-request-id': 'req-auth-audit-1',
            'x-forwarded-for': '10.0.0.1'
          }
        }),
        message: 'best effort auth audit log'
      })
    );
  } finally {
    if (previousPostgresUrl === undefined) {
      delete process.env.POSTGRES_URL;
    } else {
      process.env.POSTGRES_URL = previousPostgresUrl;
    }

    if (previousAdminPostgresUrl === undefined) {
      delete process.env.ADMIN_POSTGRES_URL;
    } else {
      process.env.ADMIN_POSTGRES_URL = previousAdminPostgresUrl;
    }
  }
});

test('createAuthAuditLog generates a stable requestId when the request has no inbound id header', async () => {
  const previousPostgresUrl = process.env.POSTGRES_URL;
  process.env.POSTGRES_URL = 'postgresql://local-test';

  const { configureSysActivityLogWriter } = await import('@/lib/system/activity-logs');
  const writes: Array<Record<string, unknown>> = [];
  configureSysActivityLogWriter(async (entry) => {
    writes.push(entry as Record<string, unknown>);
  });

  try {
    const request = new Request('http://localhost/login', {
      headers: {
        'x-forwarded-for': '10.0.0.1'
      }
    });

    await createAuthAuditLog({
      eventType: 'auth.test.generated_request_id',
      action: 'test',
      status: 'info',
      request,
      message: 'generated request id'
    });

    await createAuthAuditLog({
      eventType: 'auth.test.generated_request_id.repeat',
      action: 'test',
      status: 'info',
      request,
      message: 'generated request id repeated'
    });

    assert.equal(writes.length, 2);
    assert.match(String(writes[0]?.requestId ?? ''), /^[0-9a-f-]{36}$/i);
    assert.equal(writes[0]?.requestId, writes[1]?.requestId);
  } finally {
    configureSysActivityLogWriter(null);
    if (previousPostgresUrl === undefined) {
      delete process.env.POSTGRES_URL;
    } else {
      process.env.POSTGRES_URL = previousPostgresUrl;
    }
  }
});
