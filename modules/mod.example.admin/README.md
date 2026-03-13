# mod.example.admin

Source-host example module focused on the smallest useful modern admin showcase.

## What it demonstrates

- `adminRouteAliases` + `adminNavItems`
- SDK `TemplateBuildForm` in a module page
- SDK `DataTable` with local data (no `source.url`)
- admin-only validated server action via `createValidatedServerActionController`
- module-owned visual shell/CSS so the page looks distinct from core admin UI

## Module metadata

- `moduleId`: `mod.example.admin`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `sdkRange`: `^1.7.1`

## Routes

- Admin alias route:
  - `/admin/custom/example-admin`
- Canonical dispatcher route:
  - `/admin/modules/mod.example.admin`

## Runtime behavior

- Adds one admin nav item (`Example Admin`) pointing to `/admin/custom/example-admin`.
- Renders a module-branded admin page instead of a plain string response.
- Shows:
  - a local `DataTable` comparing the example modules in this repo
  - a `TemplateBuildForm` demo that validates through a server action without DB writes

## Config and env

- No module-specific runtime config keys.
- No module-specific env variables.

## Database and migrations

- No module-owned DB tables.
- No migrations.

## Tests and validation

Recommended checks from project root:

```bash
pnpm modules:prepare
pnpm exec tsc --noEmit
```

## Notes

- This example intentionally keeps its table local so the repo also has a clear contrast with remote `source.url` examples such as `mod.example.dashboard`, `mod.example.package`, and `mod.example.suite`.
