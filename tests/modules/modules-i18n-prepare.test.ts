import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runModulesI18nPrepare } from '../../scripts/modules-i18n-prepare';

function writeJson(filePath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function extractJsonPayload(fileContents: string) {
  const match = fileContents.match(/=\s*(\{[\s\S]*\});/);
  assert.ok(match, 'Unable to extract JSON payload.');
  return JSON.parse(match[1] as string) as Record<string, unknown>;
}

test('modules:i18n picks up any locale filename', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-i18n-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeJson(path.join(modulesDir, 'mod.alpha', 'module.json'), {
    moduleId: 'mod.alpha',
    version: '1.0.0',
    sourceEntry: 'src/manifest.ts'
  });

  writeJson(
    path.join(modulesDir, 'mod.alpha', 'i18n', 'admin', 'fr.json'),
    {
      title: 'Module Alpha'
    }
  );

  runModulesI18nPrepare({
    rootDir: tempRoot,
    modulesDir,
    logWarnings: false
  });

  const outputPath = path.join(
    tempRoot,
    'lib',
    'i18n',
    'messages',
    'modules.generated.ts'
  );
  const output = fs.readFileSync(outputPath, 'utf8');
  const payload = extractJsonPayload(output);

  const admin = payload.admin as Record<string, unknown>;
  assert.ok(admin.fr, 'Expected fr locale in admin messages.');
});
