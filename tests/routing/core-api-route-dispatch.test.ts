import assert from 'node:assert/strict';
import test from 'node:test';
import { RouteApi, route } from '@skitsaas/sdk';
import { Routes } from '../../core/routes';
import { withApiRouteEntries } from '../../lib/routing/with-api-route';

test('core api routes are named and exposed through Routes.api', () => {
  assert.equal(String(Routes.api.user.get), '/api/user');
  assert.equal(String(Routes.api.team.get), '/api/team');
  assert.equal(route('api.user.get'), '/api/user');
  assert.equal(route('api.team.get'), '/api/team');
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
