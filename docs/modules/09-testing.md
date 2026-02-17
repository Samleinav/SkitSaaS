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

Use `node:test` and call the handler directly:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { myApiHandler } from './handler';

test('api returns 401 when unauthenticated', async () => {
  const response = await myApiHandler(new Request('http://test'));
  assert.equal(response.status, 401);
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
