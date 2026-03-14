# mod.artificial.scientist

Medical research module for SKitSaaS. It creates research sessions, executes a
four-step run pipeline, stores run artifacts as compressed files, and exposes
dashboard/admin module pages through the SKSS module runtime.

## Scope

Sprint 1 focuses on:

- user-owned research sessions and runs
- sequential four-step pipeline execution
- run transparency (agent prompts, outputs, status, files)
- dashboard pages for users
- admin pages for platform oversight
- module-owned database tables and migrations

## Module metadata

- `moduleId`: `mod.artificial.scientist`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `sdkRange`: `^1.7.1`

## Routes

- Dashboard alias base:
  - `/dashboard/research`
- Admin alias base:
  - `/admin/artificial-scientist`
- Canonical dispatcher routes:
  - `/dashboard/modules/mod.artificial.scientist`
  - `/admin/modules/mod.artificial.scientist`
- API base:
  - `/api/modules/mod.artificial.scientist`

## Runtime behavior

- Creates sessions for authenticated dashboard users.
- Launches asynchronous research runs via a typed module API route.
- Tracks each run step in `mod_scientist_run_agents`.
- Stores compressed run files in S3 when configured.
- Falls back to local storage and deterministic mock pipeline responses during
  local development when cloud services are not configured.

## Config and env

Supported environment keys:

- `MOD_SCIENTIST_ALLOW_MOCK_PIPELINE`
- `MOD_SCIENTIST_LOCAL_STORAGE_ROOT`
- `MOD_SCIENTIST_S3_BUCKET`
- `MOD_SCIENTIST_S3_REGION`
- `MOD_SCIENTIST_S3_ACCESS_KEY_ID`
- `MOD_SCIENTIST_S3_SECRET_ACCESS_KEY`
- `MOD_SCIENTIST_S3_KMS_KEY_ID`
- `MOD_SCIENTIST_S3_ENDPOINT`
- `BIGQUERY_PROJECT_ID`
- `BIGQUERY_CREDENTIALS_JSON`
- `BIGQUERY_PUBMED_DATASET`
- `BEDROCK_REGION`
- `BEDROCK_ACCESS_KEY_ID`
- `BEDROCK_SECRET_ACCESS_KEY`
- `BEDROCK_FAST_AGENT12`
- `BEDROCK_STANDARD_AGENT12`
- `BEDROCK_DEEP_AGENT12`
- `BEDROCK_AGENT3_FAST`
- `BEDROCK_AGENT3_STANDARD`
- `BEDROCK_AGENT3_DEEP`
- `BEDROCK_AGENT4_FAST`
- `BEDROCK_AGENT4_STANDARD`
- `BEDROCK_AGENT4_DEEP`

## Database and migrations

- Tables live under `modules/mod.artificial.scientist/db/schema.ts`.
- Apply with:

```bash
pnpm modules:migrate -- --module=mod.artificial.scientist
```

## I18n

- Flat translations:
  - `modules/mod.artificial.scientist/i18n/translations/en.json`
  - `modules/mod.artificial.scientist/i18n/translations/es.json`

## Validation

Recommended checks from project root:

```bash
pnpm modules:prepare
pnpm modules:i18n
pnpm i18n:prepare
pnpm exec tsc --noEmit
```

## Notes

- This module stays SDK-first for routing, auth, DB access, and API routes.
- Host imports are limited to server-side translation access where the current
  SDK does not expose an equivalent server helper.
