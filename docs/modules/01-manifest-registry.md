---
title: Manifest and Registry
sidebar_position: 1
---

# Manifest and Registry

The module contract lives in `lib/modules/manifest.ts`. The registry is a static list in `lib/modules/registry.ts`.

## Manifest fields

Minimal required fields:

- `moduleId`
- `version`
- `displayName`

Optional fields:

- `description`
- `i18n` (optional inline messages, file-based is preferred)
- `adminNavItems` / `dashboardNavItems`
- `adminRouteAliases` / `dashboardRouteAliases` (custom page aliases)
- `adminDashboardWidgets` / `dashboardWidgets`
- `adminPage` / `dashboardPage`
- `apiHandler`

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

Add your module to `lib/modules/registry.ts`:

```ts
defineModule({
  moduleId: 'mod.analytics',
  version: '0.1.0',
  displayName: 'Analytics',
  description: 'Basic metrics module',
  adminRouteAliases: ['/admin/custom/analytics'],
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
  apiHandler: async (request, { slug }) => {
    if (request.method !== 'GET') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }
    if (slug?.[0] !== 'health') {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json({ ok: true });
  }
})
```

## Validation

`validateModuleManifest` only checks required fields. You should still:

- ensure custom alias paths are declared in `adminRouteAliases` / `dashboardRouteAliases`
- avoid alias collisions with core routes (`/admin/users`, `/dashboard/security`, etc.)
- ensure handlers return `null` to signal 404 when content is missing
- avoid heavy DB queries in `adminPage`/`dashboardPage` without caching
