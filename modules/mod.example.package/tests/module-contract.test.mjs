import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runSourcePackageTestSuite } from '@skitsaas/sdk/testing';

const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readModuleFile(relativePath) {
  return fs.readFileSync(path.join(moduleDir, relativePath), 'utf8');
}

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

test('source-package example tables are built from the sdk and no longer use the bespoke module table', () => {
  const tableSource = readModuleFile('src/module-data-tables.jsx');
  const moduleUiSource = readModuleFile('src/ui/module-ui.jsx');

  assert.match(tableSource, /from '@skitsaas\/sdk'/);
  assert.match(tableSource, /defineBuildTable/);
  assert.match(tableSource, /buildTableAction\.request/);
  assert.match(tableSource, /source:\s*\{/);
  assert.match(tableSource, /<DataTable/);
  assert.doesNotMatch(moduleUiSource, /export function DataTable/);
});
