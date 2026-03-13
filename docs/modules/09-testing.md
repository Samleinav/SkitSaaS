---
title: Testing Modules and Themes
sidebar_position: 9
---

# Testing Modules and Themes

## Module runtime tests

Existing tests:

- `tests/modules/module-runtime.test.ts`

Recommended additions per module:

- nav items appear when `app_modules.status='enabled'`
- nav items hidden when disabled
- admin/dashboard widgets are resolved only for enabled modules
- widget ordering is stable by `order` (and deterministic tie behavior)
- `resolveModulePage` returns `null` when disabled or handler missing
- custom alias routes resolve to the expected module + slug
- alias collision checks fail for reserved/core routes and overlapping module aliases

## API handler tests

Use `node:test` and match the test style to the API contract your module exports.

Legacy `apiHandler` from `createModuleApiRouter(...)` needs both the `Request`
and a `ModuleRouteContext`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { myApiHandler } from './handler';

test('api returns 401 when unauthenticated', async () => {
  const response = await myApiHandler(new Request('http://test/items'), {
    moduleId: 'mod.example',
    slug: ['items']
  });
  assert.equal(response.status, 401);
});
```

Typed `apiRoutes` should be tested through `dispatchApiRoutes(...)` or by
calling the specific entry handler directly:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchApiRoutes } from '@skitsaas/sdk';
import { myApiRoutes } from './routes';

test('typed route returns 200', async () => {
  const response = await dispatchApiRoutes(
    [myApiRoutes.health.handler(() => Response.json({ ok: true }))],
    new Request('http://test/api/modules/mod.example/health')
  );
  assert.equal(response?.status, 200);
});
```

## Theme runtime tests

Existing tests:

- `tests/theme/theme-runtime.test.ts`

Recommended additions:

- policy resolution (admin vs dashboard)
- user override allowed vs blocked
- mode resolution (system/light/dark)

## Smoke packs

Use the canary tooling for periodic checks:

- `pnpm restructure:module-runtime`
- `pnpm restructure:admin-smoke`
