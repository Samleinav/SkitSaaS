import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_LOCALE, resolveLocale } from '../../lib/i18n/config';
import {
  getAreaMessages,
  getAreaMessagesFromTranslator
} from '../../lib/i18n/messages';

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

test('getAreaMessagesFromTranslator translates the default tree through flat keys', () => {
  const translated = getAreaMessagesFromTranslator('global', (message) => {
    switch (message) {
      case 'Page Not Found':
        return 'Page introuvable';
      case 'Back to Home':
        return 'Retour accueil';
      case 'Unlimited Usage':
        return 'Usage illimite';
      default:
        return message;
    }
  });

  assert.equal(translated.notFound.title, 'Page introuvable');
  assert.equal(translated.notFound.backHome, 'Retour accueil');
  assert.equal(translated.pricing.planFeatures.base[0], 'Usage illimite');
  assert.equal(translated.header.home, 'Home');
});
