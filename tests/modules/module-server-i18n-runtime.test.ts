import assert from 'node:assert/strict';
import test from 'node:test';
import { createTranslator } from '../../app/sdk/src';
import { resolveHostI18nTranslationsByLocale } from '../../lib/i18n/runtime';
import { EXAMPLE_SUITE_MODULE_ID } from '../../modules/mod.example.suite/src/constants';

test('host i18n runtime resolves mod.example.suite flat translations for server-side SDK usage', () => {
  const translationsByLocale = resolveHostI18nTranslationsByLocale({
    moduleId: EXAMPLE_SUITE_MODULE_ID
  });
  const translate = createTranslator('es', {
    translationsByLocale,
    defaultLocale: 'en'
  });

  assert.equal(translate('Example Suite Admin'), 'Suite de Ejemplo Admin');
  assert.equal(translate('Create Item'), 'Crear elemento');
  assert.equal(
    translate('Create dashboard record'),
    'Crear registro del dashboard'
  );
  assert.equal(translate('Unknown key'), 'Unknown key');
});
