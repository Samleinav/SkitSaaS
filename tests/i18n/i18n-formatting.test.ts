import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatRelativeTimeLabel,
  getDateLocale,
  getLocaleDisplayName
} from '../../lib/i18n/formatting';
import { createTranslator } from '../../lib/i18n/translator';

test('getDateLocale preserves valid locale tags and falls back on invalid input', () => {
  assert.equal(getDateLocale('es'), 'es-ES');
  assert.equal(getDateLocale('fr'), 'fr');
  assert.equal(getDateLocale('invalid locale'), 'en-US');
});

test('getLocaleDisplayName resolves language names without hardcoded switcher labels', () => {
  assert.equal(
    getLocaleDisplayName('fr', 'en'),
    new Intl.DisplayNames(['en-US'], { type: 'language' }).of('fr')
  );
  assert.equal(
    getLocaleDisplayName('fr', 'es'),
    new Intl.DisplayNames(['es-ES'], { type: 'language' }).of('fr')
  );
  assert.equal(getLocaleDisplayName('invalid locale', 'en'), 'INVALID LOCALE');
});

test('formatRelativeTimeLabel uses the flat translator for ad-hoc helper copy', () => {
  const now = new Date('2026-03-09T12:00:00.000Z');
  const translate = createTranslator('es');

  assert.equal(
    formatRelativeTimeLabel({
      date: new Date('2026-03-09T11:58:00.000Z'),
      locale: 'es',
      t: translate,
      now
    }),
    'hace 2 minutos'
  );

  assert.equal(
    formatRelativeTimeLabel({
      date: new Date('2026-03-09T12:00:00.000Z'),
      locale: 'es',
      t: translate,
      now
    }),
    'ahora mismo'
  );
});
