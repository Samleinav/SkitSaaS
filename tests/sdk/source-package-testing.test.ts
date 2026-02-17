import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  runSourcePackageContractChecks,
  runSourcePackageTestSuite
} from '../../app/sdk/src/testing';

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

test('runSourcePackageContractChecks validates compiled manifest contract', async () => {
  const moduleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-testing-module-'));
  writeFile(
    path.join(moduleDir, 'dist', 'manifest.js'),
    "export default { moduleId: 'mod.testing', version: '1.0.0', displayName: 'Testing Module', adminRouteAliases: ['/admin/custom/testing'] };"
  );

  const result = await runSourcePackageContractChecks({
    moduleId: 'mod.testing',
    moduleDir
  });

  assert.equal(result.manifest.moduleId, 'mod.testing');
  assert.equal(result.manifest.version, '1.0.0');
});

test('runSourcePackageContractChecks fails when manifest contract is invalid', async () => {
  const moduleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-testing-module-'));
  writeFile(
    path.join(moduleDir, 'dist', 'manifest.js'),
    "export default { moduleId: 'mod.testing', version: '1.0.0' };"
  );

  await assert.rejects(
    () =>
      runSourcePackageContractChecks({
        moduleId: 'mod.testing',
        moduleDir
      }),
    /manifest\.displayName must be a non-empty string/
  );
});

test('runSourcePackageTestSuite combines SDK checks with custom checks', async () => {
  const moduleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-testing-module-'));
  writeFile(
    path.join(moduleDir, 'dist', 'manifest.js'),
    "export default { moduleId: 'mod.testing', version: '1.0.0', displayName: 'Testing Module', apiHandler: () => Response.json({ ok: true }) };"
  );

  const result = await runSourcePackageTestSuite({
    moduleId: 'mod.testing',
    moduleDir,
    checks: [
      ({ manifest }) => {
        assert.ok(typeof manifest.apiHandler === 'function');
      }
    ]
  });

  assert.equal(result.manifest.displayName, 'Testing Module');
});
