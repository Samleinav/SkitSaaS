---
title: Manifest and Registry
sidebar_position: 1
---

# Manifest and Registry

The canonical module contract is exported from `@skitsaas/sdk` and re-exported by `lib/modules/manifest.ts`.
The host registry is static and generated/merged into `lib/modules/registry.ts` and `lib/modules/external.generated.ts`.

## Manifest fields

Minimal required fields:

- `moduleId`
- `version`
- `displayName`

Optional fields:

- `description`
- `i18n`
- `adminNavItems` / `dashboardNavItems` / `frontendNavItems`
- `adminRouteAliases` / `dashboardRouteAliases` / `frontendRouteAliases`
- `frontendRouteAccess` (`public` | `user` | `admin`)
- `frontendSlots`
- `adminDashboardWidgets` / `dashboardWidgets`
- `adminPage` / `dashboardPage` / `frontendPage`
- `apiRoutes` (preferred typed API entries)
- `apiHandler` (legacy module API router)
- `eventHandlers`
- `templatePack` (`defaults` / `overrides`)
- `runtimeConfig` (`namespace`, manifest-defined editable BuildForm fields for `/admin/app-config/modules`)
- `authProviders`
- `paymentMethods`

Type reference: `ModuleManifest`.

## Module id conventions

Recommended:

- `core.*` for built-in modules
- `ops.*` for internal diagnostics
- `mod.*` for product modules

Keep it stable. It is used as:

- DB primary identifier (`app_modules.module_id`)
- Dispatcher URL segment
- Namespace root for module configs

## Registry example

Register module manifest with `defineModule(...)`:

```ts
const AnalyticsApiRoutes = {
  health: RouteApi('/modules/mod.analytics/health').GET().name('mod.analytics.api.health')
};

defineModule({
  moduleId: 'mod.analytics',
  version: '0.1.0',
  displayName: 'Analytics',
  description: 'Basic metrics module',
  adminRouteAliases: ['/admin/custom/analytics'],
  dashboardRouteAliases: ['/dashboard/custom/analytics'],
  frontendRouteAliases: ['/analytics'],
  frontendRouteAccess: 'public',
  eventHandlers: [],
  templatePack: {
    defaults: [{ componentId: 'ui.table', templateId: 'mod.analytics.table.default' }]
  },
  adminNavItems: [
    {
      id: 'mod.analytics.nav',
      href: '/admin/custom/analytics',
      label: 'Analytics',
      order: 50
    }
  ],
  adminPage: async ({ slug }) => {
    if (slug?.[0] === 'overview') return 'Analytics overview';
    return 'Analytics home';
  },
  apiRoutes: [
    AnalyticsApiRoutes.health.handler(() => Response.json({ ok: true }))
  ]
});
```

`apiRoutes` is the current preferred API surface. `apiHandler` remains supported for legacy modules,
but `apiRoutes` takes precedence when both are present.

## Validation

`validateModuleManifest` enforces more than required fields:

- alias format and duplicate checks (`admin`/`dashboard`/`frontend`)
- `frontendRouteAccess` enum validation
- `frontendSlots` (`slotId` format/duplicates + handler function)
- `templatePack.defaults/overrides` component ID format + duplicate checks
- `runtimeConfig` namespace/field validation (keys, kinds, env keys, select options, duplicates)
- `authProviders` (`providerId`, `kind`, `flow`, routes) validation
- `paymentMethods` (`paymentMethodId`, routes, `supportsOrderTypes`) validation

Host runtime additionally enforces alias collisions against core routes and other modules during module registry load/prepare.

## Source of truth files

- contract type surface: `app/sdk/src/modules/manifest.ts`
- host re-export: `lib/modules/manifest.ts`
- static host registry: `lib/modules/registry.ts`
- generated external registry: `lib/modules/external.generated.ts`
