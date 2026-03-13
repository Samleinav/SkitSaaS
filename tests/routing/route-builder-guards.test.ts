import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  RouteDashboard,
  configureRouteBuilderProxies,
  getRegisteredRoute,
  getRouteBuilderProxyConfig,
} from '@skitsaas/sdk';

test('RouteBuilder roles resolves the host role guard lazily at execution time', async () => {
  const previousRoleCheck = getRouteBuilderProxyConfig().roleCheck;
  let seenRoles: string[] | null = null;

  RouteDashboard('/lazy-role-guard-test')
    .roles('teacher')
    .name('test.dashboard.lazy-role-guard');

  configureRouteBuilderProxies({
    roleCheck: (allowedRoles) => async () => {
      seenRoles = [...allowedRoles];
      return null;
    },
  });

  try {
    const entry = getRegisteredRoute('test.dashboard.lazy-role-guard');
    assert.ok(entry);
    assert.equal(entry.proxies.length, 1);

    const response = await entry.proxies[0]!(
      new NextRequest('http://localhost/dashboard/lazy-role-guard-test')
    );

    assert.equal(response, null);
    assert.deepEqual(seenRoles, ['teacher']);
  } finally {
    configureRouteBuilderProxies({ roleCheck: previousRoleCheck });
  }
});

test('RouteBuilder roles fails closed when the host role guard is not configured', async () => {
  const previousRoleCheck = getRouteBuilderProxyConfig().roleCheck;

  configureRouteBuilderProxies({ roleCheck: null });

  try {
    RouteDashboard('/missing-role-guard-test')
      .roles('teacher')
      .name('test.dashboard.missing-role-guard');

    const entry = getRegisteredRoute('test.dashboard.missing-role-guard');
    assert.ok(entry);
    assert.equal(entry.proxies.length, 1);

    const response = await entry.proxies[0]!(
      new NextRequest('http://localhost/dashboard/missing-role-guard-test')
    );

    assert.ok(response);
    assert.equal(response.status, 500);
    assert.equal(await response.text(), 'Route role guard is not configured.');
  } finally {
    configureRouteBuilderProxies({ roleCheck: previousRoleCheck });
  }
});
