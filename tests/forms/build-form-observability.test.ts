import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuildFormValidationActivityLogInput } from '../../lib/forms/observability';

test('build form preflight observability logs metadata without form payload values', () => {
  const logEntry = createBuildFormValidationActivityLogInput({
    type: 'preflight.rate_limited',
    request: new Request('https://example.test/api/forms/validate', {
      headers: {
        'x-request-id': 'req-observability-1',
        'x-forwarded-for': '203.0.113.10'
      }
    }),
    formId: 'admin-create-user-form',
    area: 'admin',
    field: 'email',
    access: 'admin',
    route: '/admin/users',
    status: 429,
    retryAfterSeconds: 30,
    currentUser: {
      id: 9,
      email: 'admin@example.com',
      role: 'admin'
    }
  });

  assert.equal(logEntry.eventType, 'build_form.preflight.rate_limited');
  assert.equal(logEntry.requestId, 'req-observability-1');
  assert.equal(logEntry.ipAddress, '203.0.113.10');
  assert.deepEqual(logEntry.metadata, {
    formId: 'admin-create-user-form',
    area: 'admin',
    field: 'email',
    access: 'admin',
    route: '/admin/users',
    status: 429,
    retryAfterSeconds: 30
  });
  assert.equal(JSON.stringify(logEntry.metadata).includes('blocked@example.com'), false);
});

test('build form db resolver miss observability logs target metadata without submitted values', () => {
  const logEntry = createBuildFormValidationActivityLogInput({
    type: 'db.resolver_missing',
    operator: 'unique',
    target: 'missing.target',
    runtime: 'server',
    formId: 'missing-target-form',
    fieldName: 'email',
    user: {
      id: 5,
      email: 'admin@example.com',
      role: 'admin'
    }
  });

  assert.equal(logEntry.eventType, 'build_form.db_resolver.missing');
  assert.equal(logEntry.entityId, 'missing.target');
  assert.deepEqual(logEntry.metadata, {
    formId: 'missing-target-form',
    fieldName: 'email',
    operator: 'unique',
    runtime: 'server',
    target: 'missing.target'
  });
  assert.equal(logEntry.message, 'BuildForm DB validation target has no registered host resolver.');
});
