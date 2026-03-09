import assert from 'node:assert/strict';
import test from 'node:test';
import { createTranslator } from '../../lib/i18n/translator';

test('createTranslator resolves translated values from the generated flat registry', () => {
  const translate = createTranslator('es');

  assert.equal(translate('Save Changes'), 'Guardar cambios');
  assert.equal(translate('Users'), 'Usuarios');
  assert.equal(
    translate('Invalid email or password. Please try again.'),
    'Correo o contrasena invalidos. Intenta nuevamente.'
  );
});

test('createTranslator falls back to the original key when no translation exists', () => {
  const translate = createTranslator('es');

  assert.equal(translate('Completely missing translation key'), 'Completely missing translation key');
});

test('createTranslator returns identity for the default locale', () => {
  const translate = createTranslator('en');

  assert.equal(translate('Save Changes'), 'Save Changes');
});

test('createTranslator still resolves explicit default-locale overrides', () => {
  const translate = createTranslator('en', {
    en: {
      Cancel: 'Dismiss'
    }
  });

  assert.equal(translate('Cancel'), 'Dismiss');
});
