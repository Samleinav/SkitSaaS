---
name: core-routing-runtime
description: Modify or extend URL routing, proxy chains, and context area configuration for the host platform. Use this skill when changing Next.js App Router layout structure, adding proxy rules, modifying context areas, or adjusting module dispatcher routing.
---

# core-routing-runtime

## Scope

Next.js App Router structure, proxy chains, context areas, module dispatcher routes, and alias resolvers. **Event system is out of scope** — see `core-events-hooks`.

## Required References

- `docs/proxies/01-architecture.md` — proxy chain model, `configureAreaDefaults`, `matchRouteProxyChain`
- `docs/proxies/02-security.md` — proxy security rules
- `docs/context-area/01-frontend-routing-slots.md` — area slot model, frontend area fallback
- `docs/modules/02-runtime-routing.md` — dispatcher routes, alias resolver, route context
- `docs/modules/07-api-modules.md` — API module dispatcher

## Key Route Files

| File | Purpose |
|------|---------|
| `app/(dashboard)/admin/modules/[moduleId]/[[...slug]]/page.tsx` | Admin module dispatcher |
| `app/(dashboard)/dashboard/modules/[moduleId]/[[...slug]]/page.tsx` | Dashboard module dispatcher |
| `app/api/modules/[moduleId]/[[...slug]]/route.ts` | API module dispatcher |
| `app/(dashboard)/admin/[...moduleAlias]/page.tsx` | Admin alias resolver |
| `app/(dashboard)/dashboard/[...moduleAlias]/page.tsx` | Dashboard alias resolver |
| `lib/modules/runtime.ts` | Module page/API resolution logic |

## Context Areas

The platform uses three primary areas:
- `admin` — `/admin/*` routes
- `dashboard` — `/dashboard/*` routes
- `frontend` — public routes (`/`, `/pricing`, etc.)

Auth routes: `/admin/login` → `admin`; `/login`, `/sign-in` → `dashboard`.

## Proxy Configuration

```ts
import { configureAreaDefaults, matchRouteProxyChain } from '@skitsaas/sdk';
```

Proxy chains are ordered lists of handlers per area. See `docs/proxies/01-architecture.md` for the full contract.

## Adding a New Core Route

1. Add the file under the appropriate `app/(dashboard)/admin/` or `app/(dashboard)/dashboard/` group.
2. Ensure it does not collide with existing module alias patterns (`[...moduleAlias]`).
3. If the route needs module nav items or widgets, consume them through `lib/modules/runtime.ts` helpers.
4. Update `docs/routing/02-routes.md` with the new route.

## Alias Collision Check

```bash
pnpm modules:prepare   # fails if module aliases collide with core routes
```

## Verification

```bash
pnpm modules:prepare     # alias + sdkRange validation
pnpm exec tsc --noEmit
```
