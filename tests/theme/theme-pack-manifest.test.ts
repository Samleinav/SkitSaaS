import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeThemePackArea,
  validateThemePackManifest
} from '../../lib/themes/manifest';

test('validateThemePackManifest accepts a valid manifest', () => {
  const result = validateThemePackManifest({
    themeId: 'theme.corporate.frontend',
    version: '1.2.3',
    areas: ['frontend', 'global'],
    mode: 'tokens',
    entryTokens: 'tokens.css',
    themeRange: '^1.0.0',
    tags: ['corp', 'frontend']
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(result.manifest.areas, ['frontend', 'global']);
  assert.equal(result.manifest.themeId, 'theme.corporate.frontend');
  assert.equal(result.manifest.mode, 'tokens');
});

test('validateThemePackManifest rejects invalid areas and duplicates', () => {
  const result = validateThemePackManifest({
    themeId: 'theme.corporate.frontend',
    version: '1.2.3',
    areas: ['frontend', 'public', 'frontend'],
    mode: 'tokens',
    entryTokens: 'tokens.css',
    themeRange: '^1.0.0'
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  const messages = result.issues.map((issue) => issue.message).join(' | ');
  assert.match(messages, /area must be one of: admin, dashboard, frontend, global/);
  assert.match(messages, /duplicated/);
});

test('validateThemePackManifest rejects invalid id and semver', () => {
  const result = validateThemePackManifest({
    themeId: 'Theme.Invalid',
    version: 'v1',
    areas: ['frontend'],
    mode: 'tokens',
    entryTokens: 'tokens.css',
    themeRange: '^1.0.0'
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  const fields = result.issues.map((issue) => issue.field);
  assert.ok(fields.includes('themeId'));
  assert.ok(fields.includes('version'));
});

test('normalizeThemePackArea maps legacy public to frontend by default', () => {
  assert.equal(normalizeThemePackArea('public'), 'frontend');
  assert.equal(
    normalizeThemePackArea('public', { allowLegacyPublic: false }),
    null
  );
  assert.equal(normalizeThemePackArea('dashboard'), 'dashboard');
});
