import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('SDK root exports keep pure i18n resolvers on the server-safe runtime entry', async () => {
  const [indexJs, packageJsonRaw] = await Promise.all([
    readFile(new URL('../../app/sdk/dist/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/sdk/package.json', import.meta.url), 'utf8')
  ]);

  assert.match(indexJs, /export \{ I18nProvider, useI18n \} from '\.\/i18n\/theme\.js';/);
  assert.match(
    indexJs,
    /export \{ resolveThemeTranslationsByLocale, resolveModuleTranslationsByLocale, resolveI18nTranslationsByLocale \} from '\.\/i18n\/runtime\.js';/
  );
  assert.doesNotMatch(
    indexJs,
    /export \{ I18nProvider, useI18n, resolveThemeTranslationsByLocale, resolveModuleTranslationsByLocale, resolveI18nTranslationsByLocale \} from '\.\/i18n\/theme\.js';/
  );

  const packageJson = JSON.parse(packageJsonRaw) as {
    exports?: Record<string, string>;
  };
  assert.equal(
    packageJson.exports?.['./i18n/runtime'],
    './dist/i18n/runtime.js'
  );
});
