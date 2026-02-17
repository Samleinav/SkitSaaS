import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildModulesSyncPlan,
  type ModuleSyncRow
} from '../../scripts/modules-sync';

const now = new Date('2026-02-06T00:00:00.000Z');

test('modules:sync keeps enabled status and updates version', () => {
  const manifests = [
    { moduleId: 'mod.alpha', version: '2.0.0' }
  ];
  const existingRows: ModuleSyncRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin',
      installedAt: null,
      enabledAt: null,
      disabledAt: null,
      uninstalledAt: null
    }
  ];

  const plan = buildModulesSyncPlan({
    manifests,
    existingRows,
    options: { now }
  });

  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0]?.moduleId, 'mod.alpha');
  assert.equal(plan.updates[0]?.set.version, '2.0.0');
  assert.ok(plan.updates[0]?.set.enabledAt);
});

test('modules:sync inserts new modules as enabled by default', () => {
  const manifests = [
    { moduleId: 'mod.beta', version: '1.0.0' }
  ];

  const plan = buildModulesSyncPlan({
    manifests,
    existingRows: [],
    options: { now }
  });

  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.inserts[0]?.status, 'enabled');
  assert.ok(plan.inserts[0]?.enabledAt);
});

test('modules:sync can keep new modules installed when disabled', () => {
  const manifests = [
    { moduleId: 'mod.gamma', version: '1.0.0' }
  ];

  const plan = buildModulesSyncPlan({
    manifests,
    existingRows: [],
    options: { now, enableNew: false }
  });

  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.inserts[0]?.status, 'installed');
});
