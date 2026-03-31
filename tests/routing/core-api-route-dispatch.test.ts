import assert from 'node:assert/strict';
import test from 'node:test';
import { RouteApi, configureApiAuthProxies, getApiAuthConfig, route } from '@skitsaas/sdk';
import { Routes } from '../../core/routes';
import { withApiRouteEntries } from '../../lib/routing/with-api-route';

test('core api routes are named and exposed through Routes.api', () => {
  assert.equal(String(Routes.api.user.get), '/api/user');
  assert.equal(String(Routes.api.team.get), '/api/team');
  assert.equal(String(Routes.api.search.query), '/api/search');
  assert.equal(route('api.user.get'), '/api/user');
  assert.equal(route('api.team.get'), '/api/team');
  assert.equal(route('api.search.query'), '/api/search');
});

test('withApiRouteEntries executes typed api route proxies before the handler', async () => {
  const calls: string[] = [];

  const entry = RouteApi('/dispatch-test')
    .GET()
    .proxy([
      async () => {
        calls.push('proxy');
        return null;
      }
    ])
    .name('test.api.dispatch')
    .handler(async () => {
      calls.push('handler');
      return Response.json({ ok: true });
    });

  const GET = withApiRouteEntries(entry);
  const response = await GET(new Request('http://localhost/api/dispatch-test'));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(calls, ['proxy', 'handler']);
  assert.equal(route('test.api.dispatch'), '/api/dispatch-test');
});

test('withApiRouteEntries returns 404 when request method does not match entry method', async () => {
  const entry = RouteApi('/method-mismatch-test')
    .GET()
    .handler(async () => Response.json({ ok: true }));

  const POST = withApiRouteEntries(entry);
  const response = await POST(
    new Request('http://localhost/api/method-mismatch-test', { method: 'POST' })
  );

  assert.equal(response.status, 404);
});

test('withApiRouteEntries returns 404 when request path does not match entry path', async () => {
  const entry = RouteApi('/path-mismatch-test')
    .GET()
    .handler(async () => Response.json({ ok: true }));

  const GET = withApiRouteEntries(entry);
  const response = await GET(
    new Request('http://localhost/api/different-path')
  );

  assert.equal(response.status, 404);
});

test('withApiRouteEntries preDispatch proxies can short-circuit before auth/handler', async () => {
  const calls: string[] = [];

  const entry = RouteApi('/pre-dispatch-test')
    .GET()
    .proxy([
      async () => {
        calls.push('route-proxy');
        return null;
      }
    ])
    .handler(async () => {
      calls.push('handler');
      return Response.json({ ok: true });
    });

  const GET = withApiRouteEntries(entry, {
    preDispatch: [
      async () => {
        calls.push('pre-dispatch');
        return Response.json({ error: 'blocked' }, { status: 404 });
      }
    ]
  });

  const response = await GET(new Request('http://localhost/api/pre-dispatch-test'));

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'blocked' });
  assert.deepEqual(calls, ['pre-dispatch']);
});

test('withApiRouteEntries fails closed when api role guard is not configured', async () => {
  const previousConfig = getApiAuthConfig();

  configureApiAuthProxies({
    user: async () => null,
    admin: previousConfig.admin,
    roleCheck: null,
  });

  try {
    const entry = RouteApi('/missing-role-guard-test')
      .GET()
      .auth('user')
      .roles('teacher')
      .handler(async () => Response.json({ ok: true }));

    const GET = withApiRouteEntries(entry);
    const response = await GET(
      new Request('http://localhost/api/missing-role-guard-test')
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: 'Route role guard is not configured.',
    });
  } finally {
    configureApiAuthProxies({
      user: previousConfig.user,
      admin: previousConfig.admin,
      roleCheck: previousConfig.roleCheck,
    });
  }
});
