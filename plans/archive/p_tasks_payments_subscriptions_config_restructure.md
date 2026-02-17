---
title: Archive - Restructure Coordination
unlisted: true
---

# p_tasks_payments_subscriptions_config_restructure

Archived coordination file for the migration rollout (completed).
Current docs:
- `docs/platform-capabilities.md`
- `docs/ops-validation-pack.md`
- `docs/ops-canary-pack.md`

## Scope split

### Agent 1 - Sprint 1 (foundation + additive schema)

- Implement feature flags with legacy-safe defaults.
- Add additive schema + migrations (`app_configs`, `payment_transactions`,
  `subscription_assignments`, `app_modules`, `app_themes`,
  `user_theme_preferences`, and `payment_orders` target/order columns).
- Keep runtime behavior unchanged.
- Status: in progress (implemented in branch, pending fresh-DB migration pass).

### Agent 2 - Sprint 2 (backfill + compatibility reads)

- Implement idempotent backfill/seed scripts.
- Build compatibility read helpers (new-first with legacy fallback by flag).
- Implement parity report command for config/subscription/payments/targets.
- Status: completed.

### Agent 3 - Sprint 3-5 (dual-write, cutover, cleanup)

- Dual-write + replay worker + drift checks.
- Domain cutovers (config, subscriptions, payments, theme runtime).
- Module runtime dispatchers/nav/widgets activation.
- Contract cleanup and fallback retirement.
- Status: completed (contract cleanup applied; docs/tests aligned).

## Handoff notes (historical)

- Current branch: `feat/sprint1-restructure-foundation`.
- Migration journal state validated in `lib/db/migrations/meta/_journal.json`.
  Last applied tag: `0012_shiny_captain_cross` (next sequence should continue as `0013_*`).
- Baseline validation already run:
  - `pnpm build`
  - `pnpm db:migrate`
  - `npx tsx --test tests/payments/order-metadata.test.ts`
  - `npx tsx --test tests/payments/order-targets.test.ts`
  - `npx tsx --test tests/payments/order-subscription-lifecycle.test.ts`
  - `npx tsx --test tests/payments/admin-order-form-utils.test.ts`
  - `npx tsx --test tests/payments/admin-subscription-form-utils.test.ts`
  - `npx tsx --test --experimental-test-module-mocks tests/payments/paypal-webhook-route.test.ts`
- Baseline UI snapshots captured in `docs/baseline-snapshots/2026-02-05`.
- Sprint 1 foundation delivered:
  - Feature flags in `lib/feature-flags.ts` + `.env.example` defaults.
  - Migration observability helpers in `lib/observability/migration-metrics.ts`.
  - Additive schema + migration `lib/db/migrations/0013_sprint1_additive_schema.sql`.
  - Validation passed: `pnpm build`, `pnpm db:migrate`, and payment + flag tests.
- Sprint 2 delivered:
  - Backfill/seed runner: `scripts/restructure-backfill.ts`.
  - Parity report runner: `scripts/restructure-parity-report.ts`.
  - npm scripts: `restructure:backfill`, `restructure:parity`.
  - Compatibility read helper: `lib/config/app-config.ts`.
  - Config readers updated with app-config new-first fallback (`lib/payments/config.ts`, `lib/email/config.ts`, `lib/organizations/config.ts`).
- Sprint 4 read-cutover delivered (flag-gated):
  - Query layer cutover + fallback:
    - `lib/db/queries.ts`
      - admin/user/team subscription reads support `subscription_assignments`
      - dashboard subscription management overlay from assignments
      - app-config admin reads prefer `app_configs`
      - runtime order target reads use explicit `target_*` columns (no metadata-regex runtime path)
  - `/admin/payments` transaction view cutover:
    - `app/(dashboard)/admin/payments/page.tsx`
    - `lib/db/queries.ts::getPaymentTransactionsForAdmin(...)`
  - Single-writer guard wiring:
    - `lib/payments/subscription-single-writer.ts`
    - guard points in:
      - `lib/db/queries.ts`
      - `app/(dashboard)/admin/subscriptions/actions.ts`
      - `app/(dashboard)/admin/users/actions.ts`
      - `app/(dashboard)/dashboard/subscriptions/actions.ts`
      - `app/api/stripe/checkout/route.ts`
  - New tests:
    - `tests/payments/subscription-single-writer.test.ts`
    - updates in `tests/config-app-config.test.ts`

## Archived notes

- Migration rollout completed. Use current ops docs:
  - `docs/ops-validation-pack.md`
  - `docs/ops-canary-pack.md`

