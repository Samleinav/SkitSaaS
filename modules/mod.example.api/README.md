# mod.example.api

Example source-host module that exposes a minimal module API endpoint.

## Scope

- Demonstrates `apiHandler` registration through `createModuleApiRouter`.
- Exposes one test endpoint for runtime/dispatcher checks.

## Module metadata

- `moduleId`: `mod.example.api`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `sdkRange`: `^0.1.0`

## API routes

- Canonical module API base:
  - `/api/modules/mod.example.api/*`
- Implemented endpoint:
  - `GET /api/modules/mod.example.api/test`

Sample response:

```json
{
  "ok": true,
  "moduleId": "mod.example.api",
  "message": "Example API module is enabled."
}
```

## Config and env

- No module-specific runtime config keys.
- No module-specific env variables.

## Database and migrations

- No module-owned DB tables.
- No migrations.

## Templates and UI contract

- No page routes or template pack in this module.

## i18n

- No i18n bundles required for this API-only example.

## Tests and validation

Recommended checks from project root:

```bash
pnpm modules:prepare
npx tsx --test tests/modules/module-runtime.test.ts
```

## Troubleshooting

- If endpoint returns module not found, confirm module is enabled in `app_modules`.
- If endpoint path is not reachable, verify dispatcher route `app/api/modules/[moduleId]/[[...slug]]/route.ts` is active and module runtime flags are enabled.
