---
name: docs-runtime-reality-audit
description: Validate and reconcile documentation against real implementation, SDK/runtime contracts, and canonical example modules. Use when auditing docs drift, checking examples vs code, fixing stale module docs, or reajustando documentacion con lo real en este repo.
---

# docs-runtime-reality-audit

## Goal

Detect and fix documentation drift with a repeatable, low-noise process that
prefers real contracts over assumptions.

Use this skill when:

- docs and code may be out of sync
- module examples feel stale or contradictory
- SDK/runtime contracts may have evolved
- a previous docs cleanup introduced mixed legacy/current patterns
- you need a reliable process for future documentation reajustes

## Core method: three-pass reconciliation

Follow these passes in order.

### Pass 1. Docs-first intent

Start from the docs, not from grep-driven architecture reconstruction.

Read only the minimum relevant docs first:

1. `docs/00-documentation-index.md`
2. relevant core docs for the area being audited
3. relevant module/runtime docs under `docs/modules/*`, `docs/sdk/*`, `docs/routing/*`, `docs/portals/*`, etc.
4. module READMEs for the example or feature being compared

Goal:

- understand the intended contract
- identify the canonical docs that claim to be the source of truth
- list the exact behaviors, file paths, route shapes, and examples that must match reality

Do not start with broad repo-wide greps just to understand platform structure.

### Pass 2. Reconcile docs with real contracts

After the docs-first pass, inspect only the minimum real implementation needed
to verify the contract.

Use this trust order when sources disagree:

1. SDK/public contract types in `app/sdk/src/*`
2. host runtime behavior in files such as:
   - `lib/modules/runtime.ts`
   - `lib/routing/proxies.ts`
   - `lib/portals/role-routing.ts`
   - `app/(dashboard)/admin/guards.ts`
3. canonical example modules
4. docs
5. older skill snippets and inline comments

High-signal canonical examples in this repo:

- `modules/mod.example.api/*` for typed module API routes
- `modules/mod.example.package/*` for `source-package`
- `modules/mod.example.portal/*` for portals
- `modules/mod.example.suite/*` for larger `source-host` patterns

High-signal contract files:

- `app/sdk/src/modules/manifest.ts`
- `app/sdk/src/routing/api-route.ts`
- `app/sdk/src/routing/portal.ts`
- `app/sdk/src/server.ts`

Rules during this pass:

- verify before correcting
- inspect the minimum files only
- do not let a single stale example override the runtime contract
- explicitly separate `source-host` shortcuts from `source-package` safe patterns

### Pass 3. Consistency sweep

After fixing the obvious mismatch, run a targeted drift sweep to catch related
stale patterns elsewhere.

Common drift buckets in this repo:

- old API base examples:
  - `RouteApi('/api/modules`
  - `const BASE = '/api/modules`
  - `const API_BASE = '/api/modules`
- legacy API examples overshadowing preferred typed routes:
  - `createModuleApiRouter(`
  - `apiHandler: createModuleApiRouter`
- old alias shape:
  - `adminRouteAliases: {`
  - `dashboardRouteAliases: {`
  - `frontendRouteAliases: {`
- stale SDK range examples:
  - `^0.1.0`
- old manual bootstrap instructions:
  - `add the import to lib/routing/all-routes.ts`
  - `uncomment this module`
- portal drift:
  - `isDefaultPortal`
  - `redirectRoles`
- role model drift:
  - claims that `owner` is admin
  - wording like `admin/owner session`

The sweep is targeted, not broad. Search only the docs, skills, READMEs, and
example files connected to the same contract.

## Reliable execution order

When a mismatch is confirmed, fix in this order:

1. example README or inline comment that is directly contradicted by code
2. central docs for that contract
3. skills that would teach future agents the stale pattern
4. secondary references such as `app/sdk/README.md` if they repeat the same drift

This order keeps the most user-visible and most reusable guidance aligned first.

## Source-boundary guardrails

Do not accidentally "fix" docs by teaching the wrong boundary.

### `source-package`

- must stay SDK-only for platform capabilities
- must not normalize host imports such as `@/lib/*`, `@/components/*`, `@/app/*`
- if a `source-host` example uses a host import, call it out as a local-app-only shortcut

### `source-host`

- may use host imports when necessary
- still prefer SDK-first contracts when the SDK already exposes the capability
- do not present host-only shortcuts as the general module authoring rule

## What to say explicitly when you find drift

Always state the mismatch in concrete terms:

- which doc or example says X
- which real file/contract says Y
- which one is authoritative and why

Good examples:

- "The README still documents `apiHandler`, but `mod.example.api` now uses `apiRoutes` in `src/manifest.ts`."
- "The portal README says `isDefaultPortal: true`, but the real `portal-init.ts` uses `redirectRoles: ['hubrole']`."
- "The routing guide uses `RouteApi('/api/modules/...')`, while `RouteApi()` already prepends the API base and the SDK examples use `/modules/...`."

## Minimal verification checklist

Before finishing, verify all of these:

- the corrected docs match the actual example module files
- the corrected docs match the SDK/runtime contract
- no nearby doc still teaches the old shape
- no example now implies the wrong module boundary
- any legacy pattern left in docs is clearly labeled as legacy or migration-only

Useful closing checks:

- targeted `rg` for the stale pattern you fixed
- `git diff --stat` to confirm scope stayed focused

## Output expectations

A good documentation-reality audit should leave:

- fewer duplicate truths
- clearer source-of-truth ordering
- examples that match real code
- skills that no longer teach stale patterns
- explicit labeling of legacy vs preferred contracts

If runtime and docs disagree and you cannot safely infer intent, stop and call
out the conflict instead of "normalizing" one side by guesswork.
