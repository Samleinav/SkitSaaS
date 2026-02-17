import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAdminEnabled,
  isAreaEnabled,
  isDashboardEnabled,
  isFrontendEnabled,
  resolveAppSurfaceMode,
  resolveModuleApiSurfaceArea
} from '../../lib/config/runtime-surface';

async function loadProxySurfaceHelpers() {
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = 'test_auth_secret_surface_mode';
  }

  return await import('../../proxy');
}

test('surface mode normalization falls back to full when invalid', () => {
  assert.equal(resolveAppSurfaceMode('full'), 'full');
  assert.equal(resolveAppSurfaceMode('dashboard-only'), 'dashboard-only');
  assert.equal(resolveAppSurfaceMode('admin-only'), 'admin-only');
  assert.equal(resolveAppSurfaceMode(''), 'full');
  assert.equal(resolveAppSurfaceMode('unexpected'), 'full');
});

test('surface mode area matrix enables the expected areas', () => {
  assert.equal(isAdminEnabled('full'), true);
  assert.equal(isDashboardEnabled('full'), true);
  assert.equal(isFrontendEnabled('full'), true);

  assert.equal(isAdminEnabled('dashboard-only'), false);
  assert.equal(isDashboardEnabled('dashboard-only'), true);
  assert.equal(isFrontendEnabled('dashboard-only'), true);
  assert.equal(isAreaEnabled('admin', 'dashboard-only'), false);

  assert.equal(isAdminEnabled('admin-only'), true);
  assert.equal(isDashboardEnabled('admin-only'), false);
  assert.equal(isFrontendEnabled('admin-only'), false);
  assert.equal(isAreaEnabled('dashboard', 'admin-only'), false);
  assert.equal(isAreaEnabled('frontend', 'admin-only'), false);
});

test('module api area resolver extracts known first slug segment', () => {
  assert.equal(resolveModuleApiSurfaceArea(['admin', 'users']), 'admin');
  assert.equal(resolveModuleApiSurfaceArea(['dashboard', 'team']), 'dashboard');
  assert.equal(resolveModuleApiSurfaceArea(['public', 'feed']), 'frontend');
  assert.equal(resolveModuleApiSurfaceArea(['frontend', 'feed']), 'frontend');
  assert.equal(resolveModuleApiSurfaceArea(['checkout-sessions']), null);
  assert.equal(resolveModuleApiSurfaceArea(undefined), null);
});

test('proxy path gating enforces selected surface mode', async () => {
  const { isPathDisabledBySurfaceMode } = await loadProxySurfaceHelpers();

  assert.equal(isPathDisabledBySurfaceMode('/admin', 'full'), false);
  assert.equal(isPathDisabledBySurfaceMode('/dashboard', 'full'), false);
  assert.equal(isPathDisabledBySurfaceMode('/pricing', 'full'), false);

  assert.equal(isPathDisabledBySurfaceMode('/admin', 'dashboard-only'), true);
  assert.equal(isPathDisabledBySurfaceMode('/admin/login', 'dashboard-only'), true);
  assert.equal(isPathDisabledBySurfaceMode('/dashboard', 'dashboard-only'), false);
  assert.equal(isPathDisabledBySurfaceMode('/pricing', 'dashboard-only'), false);

  assert.equal(isPathDisabledBySurfaceMode('/admin', 'admin-only'), false);
  assert.equal(isPathDisabledBySurfaceMode('/admin/login', 'admin-only'), false);
  assert.equal(isPathDisabledBySurfaceMode('/dashboard', 'admin-only'), true);
  assert.equal(isPathDisabledBySurfaceMode('/login', 'admin-only'), true);
  assert.equal(isPathDisabledBySurfaceMode('/pricing', 'admin-only'), true);
});
