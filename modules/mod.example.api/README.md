# mod.example.api

Example source-host module that exposes a typed module API surface.

## Scope

- Demonstrates `RouteApi(...).METHOD().name()` metadata in `src/routes.ts`.
- Demonstrates `apiRoutes` handler attachment in `src/manifest.ts`.
- Exposes public, authenticated, and admin-only endpoints for runtime checks.

## Module metadata

- `moduleId`: `mod.example.api`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `sdkRange`: `^1.3.5`

## API routes

- Canonical module API base:
  - `/api/modules/mod.example.api/*`
- Implemented endpoints:
  - `GET /api/modules/mod.example.api/test`
  - `GET /api/modules/mod.example.api/status`
  - `POST /api/modules/mod.example.api/items`
  - `GET /api/modules/mod.example.api/items/{id}`
  - `DELETE /api/modules/mod.example.api/items/{id}`

Sample response for `GET /api/modules/mod.example.api/test`:

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
- If an authenticated endpoint is unexpectedly public, verify the route metadata in `src/routes.ts` still uses `.auth('user')` or `.auth('admin')`.
- If endpoint path is not reachable, verify dispatcher route `app/api/modules/[moduleId]/[[...slug]]/route.ts` is active and module runtime flags are enabled.
