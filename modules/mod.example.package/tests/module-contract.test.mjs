import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runSourcePackageTestSuite } from '@skitsaas/sdk/testing';

const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('sdk testing helpers validate compiled manifest contract', async () => {
  const result = await runSourcePackageTestSuite({
    moduleId: 'mod.example.package',
    moduleDir,
    checks: [
      ({ manifest }) => {
        assert.ok(typeof manifest.adminPage === 'function');
        assert.ok(typeof manifest.dashboardPage === 'function');
      }
    ]
  });

  assert.equal(result.manifest.moduleId, 'mod.example.package');
});
