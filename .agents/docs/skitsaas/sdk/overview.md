---
title: "SDK Overview"
sidebar_position: 0
---

# SDK Overview

Use this page when the task depends on the public SDK contract rather than the
host runtime internals.

## Main Idea

`@skitsaas/sdk` is the stable public contract for module authoring.

In this repo, many modules still run as `source-host`, but shared capabilities
should still stay SDK-first whenever the surface already exists publicly.

## Package Entrypoints

Main entrypoints:

- `@skitsaas/sdk`
- `@skitsaas/sdk/server`
- `@skitsaas/sdk/db`
- `@skitsaas/sdk/datatables`
- `@skitsaas/sdk/build`
- `@skitsaas/sdk/testing`

## `@skitsaas/sdk`

Use this package for:

- `defineModule(...)`
- manifest types and route context types
- event hook contracts
- `useI18n(...)` and flat translation helpers
- `defineThemeConfig(...)`
- notifications hook helpers
- BuildForm contracts and validation helpers
- BuildTable contracts and renderer helpers
- route factories such as `RouteAdmin`, `RouteDashboard`, `RouteFrontend`,
  `RouteApi`
- named route registry helpers
- rate limiting helpers
- role helpers

Practical rule:

- if the capability is declarative, typed, and module-facing, check here first

## `@skitsaas/sdk/server`

Use this package for:

- auth/session helpers
- auth provider handoff helpers
- governance reads
- event emitters
- notifications writes
- module config reads/writes
- DB adapter access
- revalidation helpers
- server action controllers
- BuildForm server validation helpers
- declarative module routers
- quota and feature helpers

This package is how modules consume host-configured adapters without importing
host internals directly.

## `@skitsaas/sdk/db`

Use this package for curated Drizzle exports.

Practical rule:

- import Drizzle helpers from the SDK DB entrypoint, not directly from
  `drizzle-orm/*`, when the code is meant to respect the module boundary

## `@skitsaas/sdk/build`

Use this package for:

- `source-package` build helpers
- `src -> dist` workflows meant to stay aligned with host expectations

## `@skitsaas/sdk/testing`

Use this package for:

- module contract checks
- `source-package` validation helpers
- combining SDK-level checks with module-specific assertions

## BuildForm Story

The current recommended module-facing path is:

- define forms through SDK helpers
- validate through SDK helpers
- render through SDK `BuildForm` or `TemplateBuildForm`

Why this matters:

- modules stay on SDK imports
- SkitSaaS can still bridge to richer host UI at runtime
- portability stays much healthier than host-only form imports

## Datatable Story

The current recommended path is:

- define table semantics through SDK helpers
- render through SDK `DataTable`
- let the host bridge upgrade rendering where available

Direct host datatable imports still exist, but they are no longer the default
path for normal module tables.

## Auth Provider Story

The SDK server surface also carries the shared auth-provider handoff helpers:

- `getAuthProviderStartState(...)`
- `getVerifiedAuthProviderCallbackState(...)`
- `validateAuthProviderCallbackState(...)`

That lets provider modules stay SDK-first for normal state handling.

## Governance And Notifications

Read-only governance evidence is available through SDK server helpers such as:

- `listSystemActivityLogs(...)`

Persisted notification helpers are also available through the SDK server
surface, so modules can participate in the shared notification runtime without
host-only imports.

## Decision Rule

If a module needs one of these, prefer the SDK first:

- route building
- forms
- tables
- event emits
- notifications
- config access
- DB adapter access
- server action controllers
- i18n translators
- auth/session helpers

If the capability is not exposed publicly yet, then `source-host` modules can
use a host import as migration debt.

## Common Mistakes

- importing host internals for a capability the SDK already exposes
- treating `source-host` as permission to skip SDK-first thinking
- mixing portable and host-only guidance without saying which one is preferred

## Related Docs

- `./sdk-first-migration.md`
- `../modules-and-sdk-boundaries.md`
- `../modules-development/source-package-worked-example.md`
- `../modules-development/source-host-worked-example.md`
