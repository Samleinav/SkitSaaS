---
title: Ops Canary Pack
sidebar_position: 7
---

# Ops Canary Pack

Periodic health checks + evidence capture for production and staging.

## 1) Goal

- Detect critical drift early (targets, transactions, assignments).
- Provide repeatable evidence for release gates.
- Run on a cadence (daily/weekly) and before/after deploys.

## 2) When to run

Minimum:

- **Pre-deploy (staging)**: once per release.
- **Post-deploy (production)**: within 1-2 hours after release.
- **Periodic**: daily (or at least weekly) during the canary window.

## 3) Canary report (DB checks)

Command:

```
pnpm restructure:canary
```

Environment variables:

- `CANARY_WINDOW_DAYS` (default `30`)
- `CANARY_LABEL` (optional, e.g. `prod-2026-02-05`)
- `CANARY_OUTPUT_FILE` (optional output JSON file)
- `CANARY_FAIL_ON_WARNING` (default `false`)

Example with evidence:

```
CANARY_LABEL=prod-2026-02-05 \
CANARY_WINDOW_DAYS=7 \
CANARY_OUTPUT_FILE=docs/audit/canary-reports/2026-02-05/prod-canary.json \
pnpm restructure:canary
```

## 4) Admin smoke pack (HTTP route health)

```
SMOKE_BASE_URL=https://staging.example.com \
SMOKE_AUTH_COOKIE="session=..." \
pnpm restructure:admin-smoke
```

Save output as evidence:

```
SMOKE_BASE_URL=https://staging.example.com \
SMOKE_AUTH_COOKIE="session=..." \
pnpm restructure:admin-smoke \
> docs/audit/canary-reports/2026-02-05/staging-admin-smoke.json
```

## 5) Module runtime check (DB + manifest parity)

```
pnpm restructure:module-runtime \
> docs/audit/canary-reports/2026-02-05/prod-module-runtime.json
```

## 6) Evidence folder convention

Create a dated folder per run:

```
docs/audit/canary-reports/YYYY-MM-DD/
```

Store:

- `canary.json`
- `admin-smoke.json`
- `module-runtime.json`
- Notes (optional): `notes.md` (incident IDs, action taken)

## 7) Evidence pack helper (automatic)

```
EVIDENCE_ENV=prod \
SMOKE_BASE_URL=https://staging.example.com \
SMOKE_AUTH_COOKIE="session=..." \
pnpm restructure:evidence
```

This creates:

- `docs/audit/canary-reports/YYYY-MM-DD/canary.json`
- `docs/audit/canary-reports/YYYY-MM-DD/admin-smoke.json`
- `docs/audit/canary-reports/YYYY-MM-DD/module-runtime.json`
- `docs/audit/canary-reports/YYYY-MM-DD/manifest.json`
- `docs/audit/canary-reports/YYYY-MM-DD/notes.md`

Optional env:

- `EVIDENCE_DIR` (default `docs/audit/canary-reports`)
- `EVIDENCE_DATE` (default `YYYY-MM-DD`)
- `EVIDENCE_LABEL` (override label)
- `EVIDENCE_TASKS` (`canary,smoke,module` or `all`)
- `EVIDENCE_DRY_RUN=true` (creates placeholders only)

## 8) Interpreting results

`status` meanings:

- `ok`: no critical issues.
- `warning`: lifecycle warnings detected (inspect logs).
- `critical`: missing targets/transactions/assignments or duplicates.

If `critical`:

1. Pause release or rollback if just deployed.
2. Inspect recent orders and subscription assignments.
3. Fix ingestion/writer path and re-run canary pack.

## 9) GitHub Action (cron)

Workflow:

- `.github/workflows/canary-evidence.yml`

Required secrets:

- `POSTGRES_URL`

Optional secrets:

- `SMOKE_BASE_URL`
- `SMOKE_AUTH_COOKIE`
- `EVIDENCE_ENV`

Notes:

- If no `SMOKE_BASE_URL` or `SMOKE_AUTH_COOKIE` is provided, the workflow runs `canary,module` by default.
- Artifacts are uploaded as `canary-evidence-YYYY-MM-DD` (retention 30 days).

