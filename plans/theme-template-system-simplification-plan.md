# Plan: Theme Template System Simplification (Noise Reduction + Theme-Driven UI)

Status: In Progress
Start date: 2026-02-18
Current phase: P0/P1 implementation in progress
Last review: 2026-02-19

## Objective

Simplify the backoffice template system so theme templates are easier to author as normal TSX, with minimal boilerplate and clearer data contracts.

Primary goals:

1. Move critical UI ownership (especially admin nav) from core fallback markup into theme templates.
2. Reduce wrapper noise (`data-*` attrs and repeated normalizers) that does not affect runtime behavior.
3. Make `ThemeTemplate`/`ThemeCodeTemplate` usage more predictable and less repetitive.
4. Keep deterministic build-time selection and safe fallback behavior.
5. Enforce plain-template authoring in `first-backoffice`: each template returns HTML/TSX directly from `data` (no extra shell/wrapper layer).

## Scope

- Backoffice areas (`admin`, `dashboard`) and shared private wrappers.
- Theme runtime wrappers:
  - `components/theme/theme-code-template.tsx`
  - `components/ui/theme-template.tsx`
- Core call sites under:
  - `app/(dashboard)/**`
  - `components/ui/**` where template wrappers are used.
- Theme implementation in:
  - `themes/first-backoffice/templates/**`
  - `themes/first-backoffice/components/**` (legacy wrappers to be removed from active template path)
- Contracts/tests/docs:
  - `tests/theme/**`
  - `docs/modules/14-template-controller.md`
  - `docs/modules/16-theme-authoring-guide.md`
  - `AGENTS.md` (if conventions change)

## Out of Scope

- Public frontend route-driven theme engine (`ThemeFrontendRoute`) redesign.
- Module business logic unrelated to UI template rendering.
- Visual redesign of first-backoffice styles/tokens.

## Baseline Findings (Current State)

### Architecture complexity

- Two parallel render paths exist:
  - server: `ThemeCodeTemplate` (`components/theme/theme-code-template.tsx`)
  - client: `ThemeTemplate` (`components/ui/theme-template.tsx`)
- Current usage volume:
  - `<ThemeCodeTemplate>`: 49 call sites (app/components)
  - `<ThemeTemplate>`: 17 call sites (app/components)
- Theme selection is passed manually in many places despite runtime context existing in some branches.

### High-impact functional gap

- `admin` nav previously depended on core fallback rendering. Current status:
  - core fallback kept for safety: `app/(dashboard)/admin/admin-nav.tsx`
  - theme renders full nav UI from data: `themes/first-backoffice/templates/admin/section.admin.nav.tsx`
  - host wiring passes full nav model: `app/(dashboard)/admin/layout.tsx`
- Remaining gap: finish explicit parity validation for active states and layout variants (`layout_basic`, `layout_pro`).

### Noise patterns in templates

- Many templates are wrapper-only and do not materially change structure.
- Repeated helper noise in theme templates:
  - repeated `toStringOrNull` and `toStringOrFallback`
  - local `mergeClassNames`
  - ad-hoc `normalizeArea`/`normalizeSlotClassName`
- `ui.table.control` carries metadata and helpers beyond what CSS actually consumes:
  - unused in repo: `data-theme-component-id`
  - no CSS selector uses generated slot class from `normalizeSlotClassName`.

### Metadata overuse

- `data-theme-template=*` and related attrs are emitted broadly in production, even when not used by CSS/runtime.
- Several `data-*` values appear to be only diagnostic and can move behind explicit debug mode.

### Requested simplification rule (explicit)

- `first-backoffice` templates must not rely on shell helpers/wrapper components for normal rendering.
- Each template should be a direct `return (...)` with HTML/TSX that consumes passed `data`.
- Keep only the minimum metadata required by CSS/slot runtime; other `data-theme-*` attrs should be debug-only.

### Contract/tooling mismatch

- Data contract validation for route slots is mostly regex-based text checks:
  - `tests/theme/theme-slot-data-contract.test.ts`
- This allows drift between intended data shape and what templates actually consume.

## Priority Order

1. P0 - Simplify high-impact runtime path and move admin nav ownership to theme.
2. P1 - Reduce API friction in wrapper components and remove noisy metadata defaults.
3. P2 - Consolidate contracts/tests/docs and harden long-term maintainability.

## Route and File Inventory (Priority Surface)

### Shared private wrappers

- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/private-area-header.tsx`
- `app/(dashboard)/private-area-shell.tsx`
- `themes/first-backoffice/templates/layout.private.header.tsx`
- `themes/first-backoffice/templates/layout.private.shell.tsx`

### Admin shell and nav

- `app/(dashboard)/admin/layout.tsx`
- `app/(dashboard)/admin/admin-nav.tsx`
- `themes/first-backoffice/templates/admin/layout.admin.shell.tsx`
- `themes/first-backoffice/templates/admin/section.admin.nav.tsx`
- (new optional) `themes/first-backoffice/templates/admin/section.admin.nav.item.tsx`

### Dashboard shell and controls

- `app/(dashboard)/dashboard/layout.tsx`
- `app/(dashboard)/dashboard/layout-client.tsx`
- `themes/first-backoffice/templates/dashboard/layout.dashboard.shell.tsx`
- `themes/first-backoffice/templates/ui.language-switcher.tsx`
- `themes/first-backoffice/templates/ui.theme-toggle.tsx`
- `themes/first-backoffice/templates/ui.user-menu.tsx`

### Datatable control path

- `components/ui/data-table.tsx`
- `themes/first-backoffice/templates/ui.table.control.tsx`
- `themes/first-backoffice/global.css`

### Core template runtime

- `components/ui/theme-template.tsx`
- `components/theme/theme-code-template.tsx`
- `components/theme/theme-runtime-provider.tsx`
- `lib/theme-runtime.ts`
- `lib/themes/required-code-templates.ts`

### Tests and docs

- `tests/theme/theme-slot-data-contract.test.ts`
- `tests/theme/theme-route-smoke.test.ts`
- `tests/theme/theme-code-template.test.tsx`
- `docs/modules/14-template-controller.md`
- `docs/modules/16-theme-authoring-guide.md`
- `AGENTS.md`

## Task 1 (P0): Define Simplified Template Contract v2

### Risk

If this contract is not frozen first, implementation will regress into mixed patterns again.

### Target files

- `docs/modules/16-theme-authoring-guide.md`
- `docs/modules/14-template-controller.md`
- `plans/theme-template-system-simplification-plan.md`

### Checklist

- [x] Define allowed template styles:
  - `structural` (layout/page renders real markup)
  - `slot-wrapper` (only where needed for child slot styling)
- [x] Forbid metadata-only wrappers by default.
- [x] Define default rule: no `variant`/`mode` in `data` unless template consumes them for behavior/layout.
- [x] Define debug metadata policy (`data-*` in dev-only or explicit opt-in).
- [x] Publish canonical list of required keys per template id (v2).

### Validation checklist

- [ ] Team can implement a new template without custom normalizers.
- [ ] Contract examples show fallback-equivalent template style.

### Commands

- `pnpm exec eslint docs/modules/14-template-controller.md docs/modules/16-theme-authoring-guide.md`

## Task 2 (P0): Make Admin Nav Truly Theme-Driven

### Risk

Navigation regressions break core admin operability.

### Target files

- `app/(dashboard)/admin/layout.tsx`
- `app/(dashboard)/admin/admin-nav.tsx`
- `themes/first-backoffice/templates/admin/section.admin.nav.tsx`
- `themes/first-backoffice/templates/admin/section.admin.nav.item.tsx` (new, optional)
- `tests/theme/theme-slot-data-contract.test.ts`
- `tests/theme/theme-route-smoke.test.ts`

### Checklist

- [x] Extract nav view-model builder in core (labels, href, active, children, icon id, module entries).
- [x] Pass full nav data into `section.admin.nav` template.
- [x] Render nav markup directly in theme template (not wrapper-only).
- [x] Keep fallback `AdminNav` for safety during migration window.
- [ ] If needed, add local themed `nav.item` component (or template id) to avoid repetition.

### Validation checklist

- [ ] `/admin`, `/admin/users`, `/admin/suscriptions`, `/admin/subscriptions`, `/admin/payments`, `/admin/orders`, `/admin/logs`, `/admin/app-config` preserve active-state behavior.
- [ ] Module nav items still render and route correctly.
- [ ] No visual/layout regressions in `layout_basic` and `layout_pro`.

### Commands

- `npx tsx --test tests/theme/theme-route-smoke.test.ts`
- `npx tsx --test tests/theme/theme-slot-data-contract.test.ts`
- `pnpm exec tsc --noEmit`

## Task 3 (P0): Simplify `ui.table.control` to Minimal Useful Contract

### Risk

Over-removal can break slot-level CSS hooks.

### Target files

- `themes/first-backoffice/templates/ui.table.control.tsx`
- `themes/first-backoffice/global.css`
- `components/ui/data-table.tsx`
- `tests/theme/theme-slot-data-contract.test.ts`

### Checklist

- [x] Remove unused helpers (`normalizeSlotClassName`, ad-hoc `mergeClassNames` if unnecessary).
- [x] Keep only data keys used by styling/logic (`area`, `slot`).
- [x] Remove dead metadata (`data-theme-component-id`) unless explicitly required.
- [ ] Preserve slot compatibility for:
  - `toolbar.filter`
  - `toolbar.columns-toggle*`
  - `pagination.*`
  - `body.empty`

### Validation checklist

- [ ] Admin/Dashboard datatable controls still get themed borders/backgrounds.
- [ ] No regressions in filter input, columns menu, pagination buttons.

### Commands

- `npx tsx --test tests/theme/theme-slot-data-contract.test.ts`
- `pnpm exec eslint components/ui/data-table.tsx themes/first-backoffice/templates/ui.table.control.tsx themes/first-backoffice/global.css`

## Task 4 (P1): Reduce `themeId` Prop Repetition in Client Templates

### Risk

Ambiguous theme resolution in client scope can create fallback-only rendering if context is missing.

### Target files

- `components/ui/theme-template.tsx`
- `components/theme/theme-runtime-provider.tsx`
- `app/(dashboard)/private-area-header.tsx`
- `app/(dashboard)/dashboard/layout-client.tsx`
- `app/(dashboard)/admin/app-config/section-nav.client.tsx`
- `components/ui/themed-async-submit-button.tsx`
- `components/ui/themed-confirm-submit-button.tsx`

### Checklist

- [x] Add automatic `themeId` resolution from `useThemeRuntime()` when prop is omitted.
- [x] Keep explicit `themeId` override supported.
- [x] Document when explicit `themeId` is still mandatory (outside provider scope).
- [x] Migrate client call sites inside provider scope to omit manual `themeId` where possible.

### Validation checklist

- [x] Private header still resolves admin/dashboard theme correctly.
- [x] Client templates continue to fallback safely when theme is unavailable.

### Commands

- `npx tsx --test tests/theme/theme-code-template.test.tsx`
- `npx tsx --test tests/theme/theme-route-smoke.test.ts`
- `pnpm exec tsc --noEmit`

Progress note:
- migrated `app/(dashboard)/admin/app-config/section-nav.client.tsx` and `app/(dashboard)/dashboard/activity/loading.tsx` to omit manual `themeId`.
- migrated admin/dashboard datatable slot wrappers and column renderers to stop passing manual `themeId`; `DataTable` now resolves from runtime context by default.

## Task 5 (P1): Introduce Debug-Only Metadata + Plain Template Returns

### Risk

Some selectors may currently depend on production `data-*` attributes.

### Target files

- `themes/first-backoffice/templates/**/*.tsx`
- `themes/first-backoffice/components/**/*.tsx` (deprecate from active template render path)
- `components/ui/table.tsx`
- `components/ui/async-submit-button.tsx`
- `components/ui/confirm-submit-button.tsx`
- `docs/modules/16-theme-authoring-guide.md`

### Checklist

- [x] Audit every `data-*` attribute and classify:
  - runtime-required
  - css-required
  - debug-only
- [x] Gate debug-only attrs behind env flag (`NODE_ENV === 'development'` or dedicated flag).
- [x] Keep stable attrs used by CSS/data-slot contracts.
- [x] Enforce that `themes/first-backoffice/templates/*` render directly from `data` with plain HTML/TSX (`return (...)`) and without shell wrappers.
- [x] Stop using `themes/first-backoffice/components/*` as mandatory template middleware for page/section/cell rendering.
- [x] Update tests that currently assert debug attrs in static markup.

### Validation checklist

- [x] Production markup no longer carries unnecessary template debug noise.
- [x] Development debugging remains possible when enabled.
- [x] `first-backoffice` templates compile and render without imports from template shell wrappers.

### Commands

- `npx tsx --test tests/theme/theme-code-template.test.tsx`
- `npx tsx --test tests/templates/template-debug-metadata.test.ts`
- `pnpm exec eslint themes/first-backoffice/templates components/ui`
- `rg --line-number \"from '../../components/admin|from '../../components/dashboard|from '../components/'\" themes/first-backoffice/templates`

## Task 6 (P1): Move from `unknown` Parsing to Typed Template Data

### Risk

Large surface migration; type mismatch can block builds across many files.

### Target files

- `lib/themes/template-data-contract.ts` (new)
- `components/theme/theme-code-template.tsx`
- `components/ui/theme-template.tsx`
- `app/(dashboard)/admin/layout.tsx`
- `app/(dashboard)/dashboard/layout.tsx`
- `app/(dashboard)/private-area-header.tsx`
- `themes/first-backoffice/templates/**/*.tsx`
- `tests/theme/theme-slot-data-contract.test.ts`

### Checklist

- [x] Define `TemplateDataById` map for high-impact ids first:
  - `section.admin.nav`
  - `layout.private.header`
  - `layout.private.shell`
  - `ui.table.control`
  - `ui.language-switcher`
  - `ui.theme-toggle`
  - `ui.user-menu`
- [x] Add generics so `id` narrows `data` shape in wrappers.
- [x] Remove repeated `toStringOrNull`/`toStringOrFallback` in migrated templates.
- [x] Keep transitional compatibility for non-migrated ids.

### Validation checklist

- [x] Type errors surface when core passes invalid `data`.
- [x] Theme templates compile with clear props instead of `Record<string, unknown>`.

### Commands

- `pnpm exec tsc --noEmit`
- `npx tsx --test tests/theme/theme-slot-data-contract.test.ts`

Progress note:
- migrated current `themes/first-backoffice/templates/**` entries to local typed `TemplateData` (no `data?: Record<string, unknown>` in active templates).
- standardized repeated fallback/normalization in templates through SDK helpers (`@skitsaas/sdk`):
  - `toStringOrFallback`
  - `toStringOrNull`
  - `toNumberOrFallback`
  - `mergeClassNames`
- introduced shared template base types in theme pack (`themes/first-backoffice/templates/template-types.ts`) and adopted them across `templates/dashboard/*` to reduce repeated `TemplateData`/`TemplateProps` boilerplate.
- expanded shared template base types adoption to `templates/admin/*`, keeping explicit typed extensions only where behavior requires stricter contracts (`layout.admin.shell`, `section.admin.nav`).
- completed shared template types adoption for root templates (`page.login.*`, `system.not-found`), leaving `TemplateData`/`TemplateProps` declarations centralized in `template-types.ts`.
- removed unused `themeId` prop from templates that do not consume it.

## Task 7 (P2): Flatten Theme Wrapper Components and Dead Abstractions

### Risk

Aggressive cleanup can remove useful reuse patterns.

### Target files

- `themes/first-backoffice/components/admin/page-shell.tsx`
- `themes/first-backoffice/components/dashboard/page-shell.tsx`
- `themes/first-backoffice/components/admin/section-shell.tsx`
- `themes/first-backoffice/components/admin/table-cell-shell.tsx`
- `themes/first-backoffice/components/dashboard/table-cell-shell.tsx`
- `themes/first-backoffice/templates/**/*.tsx`

### Checklist

- [x] Remove wrappers that only inject template metadata.
- [x] Keep direct plain TSX in template files; avoid reintroducing shared shell wrappers for normal rendering.
- [ ] Preserve any wrappers that are truly reused and reduce complexity.

### Validation checklist

- [ ] Theme author can open a template and understand rendering without chasing helper chains.
- [ ] No template id coverage regressions.

### Commands

- `npx tsx --test tests/theme/theme-route-smoke.test.ts`
- `pnpm exec eslint themes/first-backoffice/templates themes/first-backoffice/components`

## Task 8 (P2): Reconcile Long-Term Runtime Surface (`ThemeTemplate` vs `ThemeCodeTemplate`)

### Risk

Incorrect unification across server/client boundaries can break SSR.

### Target files

- `components/theme/theme-code-template.tsx`
- `components/ui/theme-template.tsx`
- `docs/modules/14-template-controller.md`
- `docs/modules/16-theme-authoring-guide.md`
- `tests/theme/theme-code-template.test.tsx`

### Checklist

- [ ] Decide final API strategy:
  - keep both wrappers but align props/behavior and naming
  - or introduce a thin unified facade with server/client adapters
- [ ] Ensure fallback semantics stay identical in both paths.
- [ ] Document canonical usage matrix (server route, client component, hybrid slot).

### Validation checklist

- [ ] Developers no longer guess which wrapper to use.
- [ ] New examples in docs are consistent and minimal.

### Commands

- `npx tsx --test tests/theme/theme-code-template.test.tsx`
- `pnpm exec tsc --noEmit`

## Risk Register

1. Navigation regressions in admin route tree.
   Mitigation: keep fallback `AdminNav` until parity tests pass.
2. Loss of CSS hooks due to attribute cleanup.
   Mitigation: audit selectors before removing attrs; keep `data-slot`/required markers.
3. Contract drift between core and theme templates.
   Mitigation: typed contract map + focused slot data tests.
4. Mixed old/new patterns during migration.
   Mitigation: enforce style via docs + lint/test checks in each phase.

## Implementation Order (Recommended)

1. Task 1 (contract freeze)
2. Task 2 (admin nav migration)
3. Task 3 (`ui.table.control` cleanup)
4. Task 4 (`themeId` simplification in client scope)
5. Task 5 (debug metadata policy)
6. Task 6 (typed data contracts)
7. Task 7 (wrapper flattening)
8. Task 8 (runtime API reconciliation)

## Closure Criteria

- [x] `section.admin.nav` renders real nav UI from template data (not wrapper-only).
- [x] `ui.table.control` no longer carries dead metadata/helpers.
- [x] Client template call sites are meaningfully reduced in manual `themeId` passing.
- [x] Debug-only metadata is not emitted by default in production.
- [x] Typed template data contract exists for high-impact ids.
- [x] Docs/tests updated to enforce the simplified model.
