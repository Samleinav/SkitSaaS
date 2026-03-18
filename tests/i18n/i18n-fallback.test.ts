import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_LOCALE, resolveLocale } from '../../lib/i18n/config';
import { getAreaMessages } from '../../lib/i18n/messages';

test('getAreaMessages falls back to DEFAULT_LOCALE', () => {
  const fallback = getAreaMessages('admin', DEFAULT_LOCALE);
  const other = getAreaMessages('admin', resolveLocale('xx'));

  assert.equal(other.nav.users, fallback.nav.users);
});

test('getAreaMessages falls back to DEFAULT_LOCALE for supported locales without core bundles', () => {
  const fallback = getAreaMessages('admin', DEFAULT_LOCALE);
  const french = getAreaMessages('admin', resolveLocale('fr'));

  assert.equal(french.nav.users, fallback.nav.users);
});
