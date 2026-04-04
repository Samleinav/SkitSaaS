---
title: "Modules And SDK Boundaries"
sidebar_position: 0
---

# Modules And SDK Boundaries

The module system is one of the most important structural layers in SkitSaaS.

## Runtime Model

The runtime is:

- manifest-driven in code
- state-driven in DB or config
- dispatched through canonical module routes

Key host files:

- `lib/modules/manifest.ts`
- `lib/modules/registry.ts`
- `lib/modules/runtime.ts`
- `lib/modules/sdk-server-bootstrap.ts`

Key SDK file:

- `app/sdk/src/modules/manifest.ts`

## Dispatcher Surfaces

| Surface | Route |
|---|---|
| admin module pages | `/admin/modules/[moduleId]/[[...slug]]` |
| dashboard module pages | `/dashboard/modules/[moduleId]/[[...slug]]` |
| frontend module pages | `/modules/[moduleId]/[[...slug]]` |
| module API | `/api/modules/[moduleId]/[[...slug]]` |

Friendly aliases are optional convenience routes, not the core runtime base.

## Module Modes

| Mode | What it means |
|---|---|
| `prebuilt` | host imports compiled entry |
| `source-host` | module source can use host internals when needed |
| `source-package` | portable SDK-only module consuming compiled entry |

## Boundary Rules

### `source-package`

- use SDK entrypoints for host capabilities
- do not import `@/app/*`
- do not import `@/lib/*`
- do not import `@/components/*`
- stay portable

### `source-host`

- host imports are allowed when necessary
- SDK remains the first choice when the capability exists there
- any direct host import should be treated as coupling debt

## Host Bootstrap For Module SDK

`lib/modules/sdk-server-bootstrap.ts` wires module SDK features into the host.

That bootstrap currently configures:

- auth
- database and table lookup
- config
- notifications
- governance reads
- revalidation
- event emitters
- feature and quota services
- i18n
- BuildForm DB validation and UI template resolution

This file is the reason SDK module helpers can feel host-aware without importing
host internals directly.

## Runtime Enablement

Modules are resolved by:

- static registry
- runtime mode
- enabled state from DB/config/hybrid rules

Feature flags can disable the runtime surfaces entirely.

## Build Pipeline

The normal pipeline is:

```bash
pnpm modules:build
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate
pnpm modules:sync
```

## Canonical Examples

| Module | Why use it |
|---|---|
| `modules/mod.example.package` | best `source-package` example |
| `modules/mod.example.portal` | best portal example |
| `modules/mod.example.api` | best typed API example |
| `modules/mod.example.suite` | broad source-host example |

## Practical Rules

- decide module mode before writing imports
- prefer SDK-first even in `source-host`
- use dispatcher routes and manifest metadata, not ad-hoc manual wiring
- evolve the SDK when a reusable capability is missing

## Common Mistakes

- teaching a `source-package` module to use host imports
- assuming a module page action can use host admin/dashboard controllers
- joining host billing tables directly in module code when SDK services exist
- treating aliases as the runtime instead of the dispatcher contract
