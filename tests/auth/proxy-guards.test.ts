import assert from 'node:assert/strict';
import test from 'node:test';
import { getRegisteredRoute, matchRouteProxyChain } from '@skitsaas/sdk';
import { Routes } from '../../core/routes';

async function loadProxyGuards() {
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = 'test_auth_secret_proxy_guards';
  }

  return await import('../../proxy');
}

test('public auth routes stay accessible without auth redirect', async () => {
  const { isPublicAuthRoute, resolveUnauthenticatedRedirect } =
    await loadProxyGuards();

  assert.equal(isPublicAuthRoute('/login'), true);
  assert.equal(isPublicAuthRoute('/sign-in'), true);
  assert.equal(isPublicAuthRoute('/sign-up'), true);
  assert.equal(isPublicAuthRoute('/admin/login'), true);

  assert.equal(resolveUnauthenticatedRedirect('/login'), null);
  assert.equal(resolveUnauthenticatedRedirect('/sign-in'), null);
  assert.equal(resolveUnauthenticatedRedirect('/sign-up'), null);
  assert.equal(resolveUnauthenticatedRedirect('/admin/login'), null);
});

test('admin login route stays public in the proxy registry', async () => {
  await loadProxyGuards();
  assert.equal(String(Routes.admin.login), '/admin/login');

  const adminLoginRoute = getRegisteredRoute('admin.login');

  assert.ok(adminLoginRoute);
  assert.equal(adminLoginRoute.path, '/admin/login');
  assert.deepEqual(adminLoginRoute.proxies, []);
  assert.deepEqual(matchRouteProxyChain('/admin/login'), []);
});

test('admin routes redirect to admin login when unauthenticated', async () => {
  const { resolveUnauthenticatedRedirect } = await loadProxyGuards();

  assert.equal(resolveUnauthenticatedRedirect('/admin'), '/admin/login');
  assert.equal(resolveUnauthenticatedRedirect('/admin/users'), '/admin/login');
  assert.equal(resolveUnauthenticatedRedirect('/admin/orders/create'), '/admin/login');
});

test(
  'dashboard routes redirect to legacy sign-in when unauthenticated',
  async () => {
    const { resolveUnauthenticatedRedirect } = await loadProxyGuards();

    assert.equal(resolveUnauthenticatedRedirect('/dashboard'), '/sign-in');
    assert.equal(resolveUnauthenticatedRedirect('/dashboard/general'), '/sign-in');
  }
);

test(
  'non-protected routes do not force unauthenticated redirect',
  async () => {
    const { resolveUnauthenticatedRedirect } = await loadProxyGuards();

    assert.equal(resolveUnauthenticatedRedirect('/'), null);
    assert.equal(resolveUnauthenticatedRedirect('/pricing'), null);
    assert.equal(resolveUnauthenticatedRedirect('/contact-us'), null);
    assert.equal(resolveUnauthenticatedRedirect('/administrator'), null);
  }
);
