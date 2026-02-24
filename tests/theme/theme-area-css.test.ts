import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveThemeCssAreaFromHref,
  resolveThemeCssAreaFromPath
} from '../../lib/themes/area-css';

test('theme area css resolves area from route pathname', () => {
  assert.equal(resolveThemeCssAreaFromPath('/'), 'frontend');
  assert.equal(resolveThemeCssAreaFromPath('/pricing'), 'frontend');
  assert.equal(resolveThemeCssAreaFromPath('/dashboard'), 'dashboard');
  assert.equal(resolveThemeCssAreaFromPath('/dashboard/general'), 'dashboard');
  assert.equal(resolveThemeCssAreaFromPath('/admin'), 'admin');
  assert.equal(resolveThemeCssAreaFromPath('/admin/users'), 'admin');
  assert.equal(resolveThemeCssAreaFromPath('/login'), 'dashboard');
  assert.equal(resolveThemeCssAreaFromPath('/sign-up'), 'dashboard');
  assert.equal(resolveThemeCssAreaFromPath('/admin/login'), 'admin');
});

test('theme area css resolves area from generated css href', () => {
  assert.equal(
    resolveThemeCssAreaFromHref('/.generated/core-assets/frontend/core-abc.css'),
    'frontend'
  );
  assert.equal(
    resolveThemeCssAreaFromHref('/.generated/core-assets/dashboard/core-abc.css'),
    'dashboard'
  );
  assert.equal(
    resolveThemeCssAreaFromHref('/.generated/core-assets/admin/core-abc.css'),
    'admin'
  );
  assert.equal(
    resolveThemeCssAreaFromHref('/.generated/theme-assets/theme.nexus/admin/css/asset-1.css'),
    'admin'
  );
  assert.equal(
    resolveThemeCssAreaFromHref('/.generated/theme-assets/theme.nexus/dashboard/css/asset-1.css'),
    'dashboard'
  );
  assert.equal(
    resolveThemeCssAreaFromHref('/.generated/theme-assets/theme.nexus/frontend/css/asset-1.css'),
    'frontend'
  );
  assert.equal(resolveThemeCssAreaFromHref('/_next/static/chunks/app.css'), null);
});
