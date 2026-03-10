---
name: core-platform-architecture
description: Understand or modify the host platform's architecture, database model, environment variables, and getting-started setup. Use this skill when onboarding to the codebase, planning structural changes, or configuring a new deployment.
---

# core-platform-architecture

## Scope

Host/runtime structure, database model, environment variables, getting-started guides, and platform capabilities.

## Required References

- `docs/00-documentation-index.md` — full documentation map
- `docs/getting-started/01-simple-saas.md` — single deployment setup
- `docs/getting-started/02-multi-service.md` — multi-service / split admin setup
- `docs/reference/01-platform-capabilities.md` — feature inventory and feature flags
- `docs/reference/02-database-model.md` — host tables, schema, relationships
- `docs/reference/03-env-variables.md` — all ENV variables with descriptions

## Platform Overview

This is a Next.js 16 + Drizzle ORM SaaS starter (monorepo). Package manager: **pnpm**. Runtime: **bun** (scripts), **node** (Next.js).

Key areas:

| Area | Routes | Purpose |
|------|--------|---------|
| Admin | `/admin/*` | Platform administration |
| Dashboard | `/dashboard/*` | User/team workspace |
| Frontend | `/`, `/pricing`, etc. | Public marketing |
| Auth | `/login`, `/sign-in`, `/admin/login` | Authentication |

## Key Directories

| Path | Purpose |
|------|---------|
| `app/(dashboard)/admin/` | Admin pages and actions |
| `app/(dashboard)/dashboard/` | Dashboard pages and actions |
| `app/(frontend)/` | Public frontend pages |
| `lib/db/` | Drizzle schema, queries, migrations |
| `lib/modules/` | Module runtime, registry, dispatcher |
| `lib/themes/` | Theme runtime, generated theme files |
| `lib/events/` | Event bus, catalog, queue |
| `app/sdk/` | Local SDK package source |

## Feature Flags

Platform feature flags (default `true`, set `false` to disable):
- `FF_USE_APP_MODULES_RUNTIME`
- `FF_USE_MODULE_DISPATCHER_ROUTES`

## Cross-Skill Routing

For specific concerns, use the appropriate skill:
- DB security / RLS → `core-security-auth`
- URL routing / proxies → `core-routing-runtime`
- Event system → `core-events-hooks`
- Forms / UI / i18n → `core-ui-systems`
- SDK contracts → `core-sdk-evolution`
- Billing / subscriptions → `core-payments-subscriptions`
- Ops / canary / audit → `core-operations-governance`
