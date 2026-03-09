import assert from 'node:assert/strict';
import test from 'node:test';
import { createTranslator, type FlatTranslationsByLocale } from '../../app/sdk/src';

test('SDK createTranslator uses the provided flat registry with identity fallback', () => {
  const translationsByLocale: FlatTranslationsByLocale = {
    en: {
      Cancel: 'Dismiss'
    },
    es: {
      'Save changes': 'Guardar cambios'
    }
  };

  const translateEs = createTranslator('es', {
    translationsByLocale,
    defaultLocale: 'en'
  });
  const translateEn = createTranslator('en', {
    translationsByLocale,
    defaultLocale: 'en'
  });

  assert.equal(translateEs('Save changes'), 'Guardar cambios');
  assert.equal(translateEs('Missing key'), 'Missing key');
  assert.equal(translateEs('Cancel'), 'Dismiss');
  assert.equal(translateEn('Save changes'), 'Save changes');
  assert.equal(translateEn('Cancel'), 'Dismiss');
});
