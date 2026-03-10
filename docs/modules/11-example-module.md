---
title: Example Module (End to End)
sidebar_position: 11
---

# Example Module (End to End)

This example outlines a minimal module that provides:

- an admin page
- an API endpoint
- a DB table

For a fuller reference that includes admin/dashboard subroutes, actions, widgets,
settings and module-owned tables, see:

- `modules/mod.example.suite/README.md`
- `modules/mod.example.package/README.md` (source-package variant with own build/package)

## 1) Add module DB assets

Create module-owned DB folder:

```
modules/mod.analytics/db/migrations
```

Declare DB metadata in `modules/<moduleId>/module.json`:

```json
{
  "moduleId": "mod.analytics",
  "version": "0.1.0",
  "moduleMode": "source-host",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^1.3.5",
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Add SQL migration files under `db/migrations` and apply:

```
pnpm modules:migrate
```

## 2) Add the manifest

In `lib/modules/registry.ts`:

```ts
import {
  createModuleApiRouter,
  createModulePageRouter
} from '@skitsaas/sdk/server';

const adminPage = createModulePageRouter({
  routes: [{ path: '/', handler: () => 'Analytics module is enabled.' }]
});

const apiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: () => Response.json({ ok: true })
    }
  ]
});

defineModule({
  moduleId: 'mod.analytics',
  version: '0.1.0',
  displayName: 'Analytics',
  adminRouteAliases: ['/admin/custom/analytics'],
  adminNavItems: [
    {
      id: 'mod.analytics.nav',
      href: '/admin/custom/analytics',
      label: 'Analytics',
      order: 50
    }
  ],
  adminPage,
  apiHandler
})
```

If you are using the external modules registry, add a `module.json` and let
`pnpm modules:prepare` generate the import in
`lib/modules/external.generated.ts` instead of editing the registry by hand.

## 3) Enable the module

```sql
insert into app_modules (module_id, version, status, install_mode, installed_at, enabled_at, created_at, updated_at)
values ('mod.analytics', '0.1.0', 'enabled', 'plugin', now(), now(), now(), now())
on conflict (module_id)
do update set status = 'enabled', enabled_at = now(), updated_at = now();
```

## 4) Verify

- Admin page: `/admin/modules/mod.analytics`
- Custom alias: `/admin/custom/analytics`
- API health: `/api/modules/mod.analytics/health`

If either route 404s, check:

- `FF_USE_APP_MODULES_RUNTIME` is not set to `false` (default is `true`)
- `FF_USE_MODULE_DISPATCHER_ROUTES` is not set to `false` (default is `true`)
- `app_modules.status='enabled'`
