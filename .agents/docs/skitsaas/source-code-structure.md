---
title: "Source Code Structure"
sidebar_position: 0
---

# Source Code Structure

This is the high-level map an agent usually needs before touching code.

## Top-Level Runtime Areas

| Path | Purpose |
|---|---|
| `app/(frontend)/` | public marketing, pricing, checkout, frontend module surfaces |
| `app/(login)/` | auth entrypoints like `/login` and `/admin/login` |
| `app/(dashboard)/` | authenticated admin and user areas |
| `app/(portal)/` | internal portal dispatcher reached through proxy rewrites |
| `app/api` | core API routes, validation endpoints, checkout and module API dispatchers |
| `app/sdk/src` | public SDK contracts and portable runtime helpers |
| `lib` | host runtime implementation |
| `modules` | module code and example modules |
| `themes` | theme packs, area assets, and CTC templates |

## Runtime Systems By Folder

| Folder | What lives there |
|---|---|
| `lib/routing` | area setup, proxy helpers, API wrappers, generated route registry |
| `lib/forms` | BuildForm registry, validation, preflight, DB lookups, security |
| `lib/events` | hooks catalog, handler registry, queue, bus, logging |
| `lib/modules` | manifest validation, registry, runtime dispatch, SDK bootstrap |
| `lib/templates` | component template controller and payload resolution |
| `lib/features` | host-managed feature catalog and controller helpers |
| `lib/quota` | quota enforcement used by SDK module helpers |
| `lib/portals` | portal runtime, role redirect logic, generated registry |

## UI Entry Points

| File | Role |
|---|---|
| `components/ui/build-form.tsx` | host BuildForm renderer |
| `components/ui/template-build-form.tsx` | server wrapper that resolves `ui.form` |
| `components/ui/sdk-build-form-provider.tsx` | bridge so SDK BuildForm can use host renderer |
| `components/ui/data-table.tsx` | host table adapter, legacy plus BuildTable definition mode |
| `components/ui/sdk-data-table-provider.tsx` | bridge so SDK DataTable can use host renderer |

## Canonical Runtime Files

| Concern | Files |
|---|---|
| route factories | `app/sdk/src/routing/area.ts`, `app/sdk/src/routing/builder.ts` |
| typed API routes | `app/sdk/src/routing/api-route.ts` |
| portal routes | `app/sdk/src/routing/portal.ts` |
| proxy execution | `proxy.ts`, `lib/routing/proxies.ts` |
| BuildForm contracts | `app/sdk/src/forms.ts`, `app/sdk/src/form-validation.ts` |
| BuildTable contracts | `app/sdk/src/datatables/*` |
| module manifest | `app/sdk/src/modules/manifest.ts`, `lib/modules/manifest.ts` |
| module SDK host adapters | `lib/modules/sdk-server-bootstrap.ts` |

## Canonical Example Modules

| Module | Why it matters |
|---|---|
| `modules/mod.example.package` | best portable `source-package` example |
| `modules/mod.example.portal` | best portal example |
| `modules/mod.example.suite` | broad source-host example |
| `modules/mod.example.api` | typed module API route example |

## Botble-To-SkitSaaS Mapping

If you come from Botble or Laravel, this is the closest mental mapping:

| Botble/Laravel-ish idea | SkitSaaS equivalent |
|---|---|
| middleware groups | proxy chains and area defaults |
| route helper / named route builder | `RouteAdmin`, `RouteDashboard`, `RouteFrontend`, `RouteApi`, `RoutePortal` |
| Form Builder | BuildForm plus validation and controller registry |
| Table Builder | BuildTable plus `DataTable` |
| plugin manifest | module manifest and runtime registry |
| hooks/actions | event bus and registered event handlers |
| blade/theme override | theme packs plus CTC template resolution |
| plan / feature gate service | feature controller and quota SDK helpers |

## What Agents Usually Miss

- `app/sdk/src/*` is not just support code; it is the public contract surface.
- `lib/modules/sdk-server-bootstrap.ts` is the bridge that makes module SDK
  helpers work inside this host.
- `proxy.ts` is only one enforcement layer. `/api/*` uses a different path.
- `components/ui/*` often work together with `lib/templates/*`, not in isolation.
- `modules/*` may be source-host today, but the design direction is SDK-first.
