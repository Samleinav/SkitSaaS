---
title: Documentation Audit Log (2026-02-08)
sidebar_position: 99
unlisted: true
---

# Documentation Audit Log (2026-02-08)

## Scope

Audit and alignment of project documentation against implementation in `app/`, `lib/`, and `scripts/`.

## Phase Checklist

- [x] Phase 1 - Inventory and static checks
- [x] Phase 2 - Content corrections and English normalization
- [x] Phase 3 - Docusaurus ordering and navigation
- [x] Phase 4 - Final verification and publication notes

## Phase 1 Findings (Detected)

1. `docs/module-development.md` had active content in Spanish.
2. `docs/env-variables.md` had a broken markdown table in the PayPal section.
3. `docs/ops-validation-pack.md` listed `FF_USE_THEME_RUNTIME=true` as a default, while code defaults to `false` (`lib/feature-flags.ts`).
4. Core route coverage in top-level docs was incomplete (for example: `/admin/logs`, `/admin/app-config/theme`, `/dashboard/activity`, `/dashboard/general`, `/dashboard/security`).
5. `docs/modules/08-themes.md` used policy keys in camelCase, but runtime DB keys are `allow_user_override`, `admin.default`, `dashboard.default`.
6. Root documentation ordering for Docusaurus was not explicit enough for a publish-ready flow.

## Phase 2 Changes (Applied)

- Reworked route/action architecture map in:
  - `docs/architecture-routing-actions.md`
- Reworked top-level capability map in:
  - `docs/platform-capabilities.md`
- Rebuilt env/runtime reference with corrected formatting and expanded script vars in:
  - `docs/env-variables.md`
- Corrected validation defaults and route checklist in:
  - `docs/ops-validation-pack.md`
- Corrected active route descriptions in payment lifecycle guide:
  - `docs/payment-events.md`
- Corrected theme policy key names in module docs:
  - `docs/modules/08-themes.md`
- Minor docs quality fix (list formatting):
  - `docs/modules/09-testing.md`
- English normalization for active docs:
  - `docs/module-development.md`

## Phase 3 Changes (Docusaurus Order)

New files created:

- `docs/00-documentation-index.md`
- `docs/modules/_category_.json`
- `docs/sdk/_category_.json`
- `docs/archive/_category_.json`

Sidebar ordering normalized via `sidebar_position` in top-level docs.

Archive handling:

- Added `unlisted: true` frontmatter to archived legacy docs so public sidebar stays focused:
  - `docs/archive/appmodular.md`
  - `docs/archive/pendientes.md`
  - `docs/archive/p_tasks_payments_subscriptions_config_restructure.md`

## Phase 4 Verification

Checks executed after changes:

1. Language scan on active docs (`docs/` excluding archive/evidence) -> no Spanish matches.
2. Route coverage diff (documented vs actual `app/**/page.tsx`) -> no mismatches, except `/` (root page) not explicitly documented.
3. File-path reference validation -> only intentional template placeholders remain in `docs/ops-canary-pack.md` (`docs/canary-reports/YYYY-MM-DD/*`).
4. Script reference validation (`pnpm <script>`) -> no missing scripts.

## Publication Notes

- Active technical docs are now in English and ordered for Docusaurus consumption.
- Archived legacy planning files remain available but hidden from standard navigation.
- Recommended entrypoint for readers: `docs/00-documentation-index.md`.
