# mod.example.admin

Example source-host module that adds a simple admin page and admin nav alias.

## Scope

- Demonstrates `adminRouteAliases` registration.
- Demonstrates `adminNavItems` registration.
- Renders a minimal `adminPage` response for runtime verification.

## Module metadata

- `moduleId`: `mod.example.admin`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `sdkRange`: `^0.1.0`

## Routes

- Admin alias route:
  - `/admin/custom/example-admin`
- Canonical dispatcher route:
  - `/admin/modules/mod.example.admin`

## Runtime behavior

- Adds one admin nav item (`Example Admin`) pointing to `/admin/custom/example-admin`.
- Page renderer returns:
  - `Example admin module is enabled.`

## Config and env

- No module-specific runtime config keys.
- No module-specific env variables.

## Database and migrations

- No module-owned DB tables.
- No migrations.

## Templates and UI contract

- No module template pack declared.
- Uses plain string response for page output.

## i18n

- Includes locale messages under:
  - `i18n/admin/en.json`
  - `i18n/admin/es.json`

## Tests and validation

Recommended checks from project root:

```bash
pnpm modules:prepare
npx tsx --test tests/modules/module-runtime.test.ts
```

## Troubleshooting

- If route does not render, verify module is enabled in `app_modules`.
- If nav item does not appear, confirm module registry load and alias validation succeeded in `modules:prepare`.
