# Plan: module widgets for /dashboard user area

## Status (2026-02-08)

- `ModuleManifest` already supports both `adminDashboardWidgets` and `dashboardWidgets`.
- Runtime currently exposes `getEnabledAdminDashboardModuleWidgets()` only.
- `/admin` renders module widgets through `getEnabledAdminDashboardModules()`.
- `/dashboard` does not load or render `dashboardWidgets` from enabled modules.

## Execution update (2026-02-09)

- [x] Phase 1 runtime support completed.
- [x] Phase 2 dashboard host integration completed.
- [x] Phase 4 runtime tests for widget filtering/ordering completed.
- [x] Phase 5 docs sync completed (`docs/modules/06-nav-widgets.md`, `docs/modules/09-testing.md`).

## Goal

Allow enabled modules to inject widgets into `/dashboard` (user area) with deterministic ordering, current auth guarantees, and clear developer docs.

## Scope

- Module runtime (`lib/modules/runtime.ts`)
- Dashboard home composition (`app/(dashboard)/dashboard/*`)
- Module runtime tests (`tests/modules/*`)
- Technical documentation updates in `docs/`

## Out of scope

- Per-user drag and drop layout customization
- Widget marketplace or remote widget delivery
- Full visual redesign of `/dashboard`

## Phase 1: Runtime support

1. Add `getEnabledDashboardModuleWidgets()` in `lib/modules/runtime.ts`.
2. Reuse existing enabled-module filtering and `order` sorting behavior.
3. Keep behavior aligned with admin widget resolution.

## Phase 2: Dashboard host integration

1. Introduce a dashboard home module registry (core sections + module widgets), similar to admin composition.
2. Merge core dashboard sections with `getEnabledDashboardModuleWidgets()` output.
3. Render merged modules in `app/(dashboard)/dashboard/page.tsx`.
4. Preserve current dashboard behavior when no module widgets are configured.

## Phase 3: Contract and safety

1. Define a minimal `DashboardWidgetProps` contract to avoid tight coupling.
2. Ensure module widget IDs are unique enough for React keys and predictable rendering.
3. Keep execution behind existing module-enabled checks (`app_modules.status='enabled'`).

## Phase 4: Tests

1. Extend `tests/modules/module-runtime.test.ts` with dashboard widget resolution cases.
2. Cover only-enabled-module behavior for dashboard widgets.
3. Verify stable numeric ordering by `order`.
4. Verify empty result when runtime flag is disabled.
5. Add dashboard integration smoke test if no current test covers rendered widget composition.

## Phase 5: Documentation

1. Update `docs/modules/06-nav-widgets.md` with real runtime entrypoints for admin and dashboard widgets.
2. Update `docs/platform-capabilities.md` (or `docs/module-development.md`) to document dashboard widget composition.
3. Clarify in docs that admin dashboard widgets and dashboard user-area widgets have separate hosts but shared manifest fields.

## Exit criteria

- `/dashboard` renders `dashboardWidgets` from enabled modules.
- Ordering follows manifest `order`, then stable tie behavior.
- No regression for existing `/admin` module widgets.
- Runtime and dashboard tests pass.
- Developer docs are updated to match implementation.

## Risks

- Current `/dashboard` page is client-heavy; integration may require server/client split for clean data loading.
- Widget props can leak internal data shape if not constrained early.
