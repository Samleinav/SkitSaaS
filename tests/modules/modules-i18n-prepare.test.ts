import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { runI18nPrepare } from '../../scripts/i18n-prepare';
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

function writeLocaleAreaFile(
  rootDir: string,
  locale: string,
  area: string,
  payload: string = '{}'
) {
  const filePath = path.join(rootDir, 'lib', 'i18n', 'locales', locale, `${area}.ts`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `export default ${payload};\n`, 'utf8');
}

async function importGeneratedTranslations(filePath: string) {
  const href = `${pathToFileURL(filePath).href}?ts=${Date.now()}`;
  return import(href);
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

test('i18n:prepare ingests module flat translations and prefers dist output when present', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-flat-i18n-'));
  const modulesDir = path.join(tempRoot, 'modules');

  for (const locale of ['en', 'es']) {
    for (const area of ['global', 'admin', 'dashboard', 'login']) {
      writeLocaleAreaFile(tempRoot, locale, area);
    }
  }

  writeJson(path.join(modulesDir, 'mod.alpha', 'module.json'), {
    moduleId: 'mod.alpha',
    version: '1.0.0',
    sourceEntry: 'src/manifest.ts'
  });
  writeJson(
    path.join(modulesDir, 'mod.alpha', 'i18n', 'translations', 'es.json'),
    {
      'Alpha title': 'Titulo Alpha'
    }
  );

  writeJson(path.join(modulesDir, 'mod.beta', 'module.json'), {
    moduleId: 'mod.beta',
    version: '1.0.0',
    sourceEntry: 'src/manifest.ts'
  });
  writeJson(
    path.join(modulesDir, 'mod.beta', 'i18n', 'translations', 'es.json'),
    {
      'Beta title': 'Titulo desde source'
    }
  );
  writeJson(
    path.join(modulesDir, 'mod.beta', 'dist', 'i18n', 'translations', 'es.json'),
    {
      'Beta title': 'Titulo desde dist'
    }
  );

  const result = await runI18nPrepare({
    rootDir: tempRoot,
    modulesDir,
    logWarnings: false
  });
  const generated = await importGeneratedTranslations(result.translationsPath);
  const flatTranslationsByLocale = generated.flatTranslationsByLocale as Record<
    string,
    Record<string, string>
  >;

  assert.equal(flatTranslationsByLocale.es?.['Alpha title'], 'Titulo Alpha');
  assert.equal(flatTranslationsByLocale.es?.['Beta title'], 'Titulo desde dist');
});

test('i18n:prepare fails on conflicting module flat translations', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-flat-i18n-conflict-'));
  const modulesDir = path.join(tempRoot, 'modules');

  for (const area of ['global', 'admin', 'dashboard', 'login']) {
    writeLocaleAreaFile(tempRoot, 'en', area);
  }

  writeJson(path.join(modulesDir, 'mod.alpha', 'module.json'), {
    moduleId: 'mod.alpha',
    version: '1.0.0',
    sourceEntry: 'src/manifest.ts'
  });
  writeJson(
    path.join(modulesDir, 'mod.alpha', 'i18n', 'translations', 'es.json'),
    {
      'Shared key': 'Valor Alpha'
    }
  );

  writeJson(path.join(modulesDir, 'mod.beta', 'module.json'), {
    moduleId: 'mod.beta',
    version: '1.0.0',
    sourceEntry: 'src/manifest.ts'
  });
  writeJson(
    path.join(modulesDir, 'mod.beta', 'i18n', 'translations', 'es.json'),
    {
      'Shared key': 'Valor Beta'
    }
  );

  await assert.rejects(
    () =>
      runI18nPrepare({
        rootDir: tempRoot,
        modulesDir,
        logWarnings: false
      }),
    /Conflicting module flat translation for locale "es" key "Shared key"/
  );
});

test('i18n:prepare fails on conflicting core and module flat translations', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-flat-i18n-core-conflict-'));
  const modulesDir = path.join(tempRoot, 'modules');

  for (const area of ['admin', 'dashboard', 'login']) {
    writeLocaleAreaFile(tempRoot, 'en', area);
    writeLocaleAreaFile(tempRoot, 'es', area);
  }

  writeLocaleAreaFile(tempRoot, 'en', 'global', `{ actions: { save: 'Save changes' } }`);
  writeLocaleAreaFile(tempRoot, 'es', 'global', `{ actions: { save: 'Guardar cambios' } }`);

  writeJson(path.join(modulesDir, 'mod.alpha', 'module.json'), {
    moduleId: 'mod.alpha',
    version: '1.0.0',
    sourceEntry: 'src/manifest.ts'
  });
  writeJson(
    path.join(modulesDir, 'mod.alpha', 'i18n', 'translations', 'es.json'),
    {
      'Save changes': 'Salvar cambios'
    }
  );

  await assert.rejects(
    () =>
      runI18nPrepare({
        rootDir: tempRoot,
        modulesDir,
        logWarnings: false
      }),
    /Conflicting flat translations detected during i18n:prepare\./
  );
});
