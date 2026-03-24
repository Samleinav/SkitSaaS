import assert from 'node:assert/strict';
import test from 'node:test';
import { recordModuleDispatchFailure } from '../../lib/observability/migration-metrics';

function flushMicrotasks() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

test('recordModuleDispatchFailure also emits a governance activity log entry', async () => {
  const { configureSysActivityLogWriter } = await import('@/lib/system/activity-logs');
  const writes: Array<Record<string, unknown>> = [];
  configureSysActivityLogWriter(async (entry) => {
    writes.push(entry as Record<string, unknown>);
  });

  try {
    const metric = recordModuleDispatchFailure('mod.example.audit', 'handler_missing', {
      source: '/dashboard/modules/mod.example.audit',
      requestId: 'req-module-dispatch-1'
    });

    await flushMicrotasks();

    assert.equal(metric.metric, 'migration.module_dispatch.failed');
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.eventType, 'module.dispatch.failed');
    assert.equal(writes[0]?.eventCategory, 'module_runtime');
    assert.equal(writes[0]?.entityId, 'mod.example.audit');
    assert.equal(writes[0]?.requestId, 'req-module-dispatch-1');
  } finally {
    configureSysActivityLogWriter(null);
  }
});
