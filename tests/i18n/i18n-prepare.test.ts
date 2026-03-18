import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runI18nPrepare } from '../../scripts/i18n-prepare';

const AREAS = ['global', 'admin', 'dashboard', 'login'] as const;

function writeLocaleAreaFile(rootDir: string, locale: string, area: string) {
  const filePath = path.join(rootDir, 'lib', 'i18n', 'locales', locale, `${area}.ts`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, 'export default {};\n', 'utf8');
}

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

test('i18n:prepare generates supported locales and core message registry', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-prepare-'));

  for (const locale of ['en', 'fr']) {
    for (const area of AREAS) {
      writeLocaleAreaFile(tempRoot, locale, area);
    }
  }

  const result = await runI18nPrepare({ rootDir: tempRoot, logWarnings: false });

  assert.deepEqual(result.locales, ['en', 'fr']);

  const supportedLocales = fs.readFileSync(result.supportedLocalesPath, 'utf8');
  assert.match(supportedLocales, /export const SUPPORTED_LOCALES = \["en","fr"\] as const;/);

  const coreMessages = fs.readFileSync(result.coreMessagesPath, 'utf8');
  assert.match(coreMessages, /import fr_dashboard from '\.\/locales\/fr\/dashboard';/);
  assert.match(coreMessages, /dashboard:\s*\{\s*en: en_dashboard,\s*fr: fr_dashboard,/s);

  const translations = fs.readFileSync(result.translationsPath, 'utf8');
  assert.match(
    translations,
    /export const flatTranslationsByLocale = \{\s*"en": \{\},\s*"fr": \{\}\s*\} satisfies Record<string, Record<string, string>>;/s
  );
  assert.match(
    translations,
    /export const flatTranslationConflictsByLocale = \{\s*"en": \[],\s*"fr": \[]\s*\} satisfies Record<string, FlatTranslationConflict\[]>;/s
  );

  const moduleTranslations = fs.readFileSync(
    result.moduleFlatTranslationsPath,
    'utf8'
  );
  assert.match(
    moduleTranslations,
    /export const flatTranslationsByModuleId: FlatTranslationsByModuleId = \{\s*\};/s
  );
});

test('i18n:prepare fails when a locale is missing a required area file', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-prepare-missing-'));

  for (const area of AREAS) {
    writeLocaleAreaFile(tempRoot, 'en', area);
  }

  writeLocaleAreaFile(tempRoot, 'fr', 'global');
  writeLocaleAreaFile(tempRoot, 'fr', 'admin');
  writeLocaleAreaFile(tempRoot, 'fr', 'dashboard');

  await assert.rejects(
    () => runI18nPrepare({ rootDir: tempRoot, logWarnings: false }),
    /Missing login\.ts for locale "fr"/
  );
});

test('i18n:prepare extends supported locales from theme config and module manifest registrations', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-prepare-extended-'));

  for (const area of AREAS) {
    writeLocaleAreaFile(tempRoot, 'en', area);
  }

  writeFile(
    path.join(tempRoot, 'themes', 'pilot', 'theme.json'),
    JSON.stringify({
      themeId: 'theme.pilot.admin',
      version: '1.0.0',
      areas: ['admin'],
      mode: 'tokens',
      entryTokens: 'tokens.css',
      themeRange: '^1.0.0'
    })
  );
  writeFile(path.join(tempRoot, 'themes', 'pilot', 'tokens.css'), ':root{}');
  writeFile(
    path.join(tempRoot, 'themes', 'pilot', 'config.ts'),
    'export default { additionalLocales: ["fr"] };\n'
  );

  writeFile(
    path.join(tempRoot, 'modules', 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      sourceEntry: 'src/manifest.ts'
    })
  );
  writeFile(
    path.join(tempRoot, 'modules', 'mod.alpha', 'src', 'manifest.ts'),
    'export default { additionalLocales: ["pt-BR", "fr"] };\n'
  );

  const result = await runI18nPrepare({ rootDir: tempRoot, logWarnings: false });

  assert.deepEqual(result.locales, ['en', 'fr', 'pt-br']);

  const supportedLocales = fs.readFileSync(result.supportedLocalesPath, 'utf8');
  assert.match(
    supportedLocales,
    /export const SUPPORTED_LOCALES = \["en","fr","pt-br"\] as const;/
  );

  const coreMessages = fs.readFileSync(result.coreMessagesPath, 'utf8');
  assert.doesNotMatch(coreMessages, /locales\/fr\/dashboard/);
  assert.doesNotMatch(coreMessages, /locales\/pt-br\/dashboard/);
});
