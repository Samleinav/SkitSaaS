# mod.example.dashboard

Example source-host module that demonstrates dashboard + frontend aliases and frontend slot rendering.

## Scope

- Demonstrates `dashboardRouteAliases` and `dashboardNavItems`.
- Demonstrates `frontendRouteAliases` and `frontendPage`.
- Demonstrates module frontend slot registration.

## Module metadata

- `moduleId`: `mod.example.dashboard`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `sdkRange`: `^1.3.5`

## Routes

- Dashboard alias route:
  - `/dashboard/custom/example-dashboard`
- Frontend alias route:
  - `/features/example-dashboard`
- Canonical dispatcher routes:
  - `/dashboard/modules/mod.example.dashboard`
  - `/modules/mod.example.dashboard`

## Runtime behavior

- Adds one dashboard nav item (`Example Dashboard`) pointing to `/dashboard/custom/example-dashboard`.
- Dashboard page renderer returns:
  - `Example dashboard module is enabled.`
- Frontend page renderer returns:
  - `Example frontend module is enabled.`
- Frontend slot:
  - `frontend.contact.form.primary` -> `Example contact form slot rendered from module.`

## Config and env

- No module-specific runtime config keys.
- No module-specific env variables.

## Database and migrations

- No module-owned DB tables.
- No migrations.

## Templates and UI contract

- No module template pack declared.
- Uses plain string responses in this example.

## i18n

- Includes locale messages under:
  - `i18n/dashboard/en.json`
  - `i18n/dashboard/es.json`

## Tests and validation

Recommended checks from project root:

```bash
pnpm modules:prepare
npx tsx --test tests/modules/module-runtime.test.ts
```

## Troubleshooting

- If dashboard nav item does not appear, verify module is enabled and route alias did not collide.
- If frontend alias does not resolve, verify alias is not colliding with core frontend routes.
- If slot fallback renders instead of module slot, verify slot id and module status in runtime.
