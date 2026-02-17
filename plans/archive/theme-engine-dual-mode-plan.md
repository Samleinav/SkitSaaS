# Plan: Dual Theme Engine (runtime + build) with external theme packages

## Status (2026-02-08)

- Requested and pending implementation.
- No code changes applied in this plan.

## Objective

Design and execute a full theme system that:

1. Switches complete theme experience (styles + structure) for `admin`, `dashboard`, and `front`.
2. Supports two operation modes:
- `runtime`: editable live from admin (DB/config driven).
- `build`: selected before build and frozen until next deploy.
3. Lets each theme ship programmable config (`theme-config.tsx`) with:
- runtime-editable values (when mode = `runtime`)
- build-time fixed values (when mode = `build`)
4. Reduces DB pressure using deterministic caching and explicit invalidation.

## Scope

- Theme architecture contracts in `lib/theme-*`.
- Theme package discovery and registry generation (similar to modules).
- Admin theme operations and mode behavior.
- Public/front route organization for theme hosting.
- Performance/caching strategy and test strategy.
- Documentation updates in `docs/` once implementation starts.

## Out of scope

- Marketplace/remote download of themes at runtime.
- Per-tenant visual editor.
- Real-time CSS builder in browser.
- Breaking URL changes for existing public pages (`/`, `/pricing`, `/sign-in`, `/sign-up`).

## Current state (confirmed)

- Current runtime resolves mode/defaults from `app_configs` + env and selection from `app_themes` + `user_theme_preferences` (`lib/theme-runtime.ts`, `lib/theme-config.ts`).
- Current behavior mainly toggles `dark/light` and sets `data-theme-key`; there is no full packaged theme switch (layout/component pack).
- `FF_USE_THEME_RUNTIME` currently gates runtime flow; disabled mode falls back to local-storage toggle, not a full build-selected theme system.
- Public frontend is mixed under `app/(dashboard)` routes and does not have a dedicated front route group.
- Modules already have static discovery + generated registry + sync flow (`scripts/modules-prepare.ts`, `scripts/modules-sync.ts`), which is a valid blueprint.

## Target architecture

## 1) Theme package model (external, compile-time)

Create root folder `themes/` (parallel to `modules/`):

- `themes/<themeId>/theme.json`
- `themes/<themeId>/src/manifest.ts`
- `themes/<themeId>/src/theme-config.tsx`
- `themes/<themeId>/src/tokens.css`
- `themes/<themeId>/src/areas/admin/*`
- `themes/<themeId>/src/areas/dashboard/*`
- `themes/<themeId>/src/areas/front/*`

Manifest contract (planned):

- identity: `themeId`, `version`, `displayName`
- supported areas: `admin`, `dashboard`, `front`
- optional area hosts:
- `adminLayout`, `dashboardLayout`, `frontLayout`
- optional slot components per area
- token source reference (`tokens.css` or runtime token factory)
- config schema definition source (`theme-config.tsx`)

## 2) Theme config contract (`theme-config.tsx`)

Each theme exports typed config with two channels:

- `buildDefaults`: values baked into build output.
- `runtimeConfig`: values that may be overridden from DB when engine mode is `runtime`.

Proposed shape:

- `schema`: typed fields (`string`, `number`, `boolean`, `enum`, `json`) + validation.
- `exposure`: per field visibility (`build_only`, `runtime_editable`, `internal`).
- `resolver`: merges defaults + runtime values and returns final design tokens / component props.

Rules:

- In `build` mode, runtime-editable fields are ignored from DB reads.
- In `runtime` mode, only `runtime_editable` fields can be changed from admin.

## 3) Dual engine mode

Add unified engine switch:

- `THEME_ENGINE_MODE=runtime|build`

Behavior:

- `runtime`
- Resolve theme selection by area from DB/env/admin policy.
- Allow live admin changes.
- Use cache + invalidation.
- `build`
- Resolve selected theme per area only from env/build config.
- No DB reads for theme selection or theme-config overrides in request path.
- Admin shows read-only status and exact env keys currently active.

Compatibility:

- Keep `FF_USE_THEME_RUNTIME` during migration window.
- Later consolidate flags so mode controls behavior directly.

## 4) Theme resolution pipeline

Resolution order by area (`admin`, `dashboard`, `front`):

1. user override (only when `runtime` and policy allows)
2. area default from policy/config
3. area active theme fallback
4. global fallback theme defined by build config

For `build` mode:

- user override disabled by contract
- DB policy/active tables skipped in request path
- selection is deterministic from environment/build artifacts

## 5) Front route organization

Normalize public area under `app/(front)` while preserving current public URLs:

- `app/(front)/layout.tsx`
- `app/(front)/page.tsx`
- `app/(front)/pricing/page.tsx`
- `app/(front)/sign-in/page.tsx` (or keep auth in `(login)` if desired, but host from `front` shell)
- `app/(front)/sign-up/page.tsx`

Theme host strategy:

- one stable route tree
- area host chooses theme package layout/slots at runtime/build
- avoid per-theme duplicated routes like `app/front/theme1/*` unless product truly needs fully independent pages

Note:

- If strict isolation is required for some customers, support optional theme route aliases later, not in phase 1.

## 6) Registry and scripts (like modules)

Add scripts:

- `themes:prepare`
- Scans `themes/*`, validates manifest/config exports, writes `lib/themes/external.generated.ts`.
- `themes:sync` (runtime mode only)
- Syncs available themes metadata to `app_themes` without forcing activation.
- optional `themes:verify`
- Validates schema collisions, missing area hosts, and invalid defaults.

Integrate with existing lifecycle:

- `predev`: `modules:*` + `themes:prepare` + optional `themes:sync`
- `prebuild`: `modules:*` + `themes:prepare`

## 7) Data model strategy

Keep existing tables, extend usage:

- `app_themes`: catalog + activation metadata (runtime mode)
- `app_configs` namespace `theme`: policy and runtime override values
- `user_theme_preferences`: only used in runtime mode

Additions planned:

- key for engine mode (`theme.engine_mode`) as DB fallback if env unset
- namespaced keys for per-theme runtime config values, for example:
- `theme.<themeId>.admin.<key>`
- `theme.<themeId>.dashboard.<key>`
- `theme.<themeId>.front.<key>`

Constraint:

- runtime config writes must validate against the active theme schema.

## 8) Caching strategy (DB read reduction)

Layered cache plan:

1. Request-local cache:
- keep existing `cache()` semantics for repeated calls in same request.
2. Cross-request server cache:
- use `unstable_cache` for:
- theme policy bundle
- active themes by area
- current user preference lookup
3. Cache invalidation:
- `revalidateTag('theme-policy')`
- `revalidateTag('theme-active')`
- `revalidateTag('theme-user:<userId>')`
- trigger on admin updates and user toggle actions.
4. Build mode bypass:
- short-circuit all DB theme loaders before any query.

Performance target:

- `build` mode: zero theme-related DB queries in normal request path.
- `runtime` mode warm path: one cached read bundle for policy/active per area, plus optional cached user preference.

## 9) Admin UX plan

In `/admin/app-config/theme`:

- add engine mode selector with explicit warning:
- `build` mode requires rebuild + deploy for changes.
- runtime mode:
- editable defaults/policy + runtime-config fields from active theme schema.
- build mode:
- controls read-only except optional "generate env snippet" helper.
- add diagnostics panel:
- resolution source, cache status, selected theme per area.

## 10) Testing plan

Unit:

- theme manifest validation (missing hosts, invalid schema, invalid defaults)
- config resolver merge logic (`buildDefaults` + runtime overrides)
- mode resolver (`runtime` vs `build`) for each area

Runtime integration:

- admin/dashboard/front resolve expected theme and layout host
- runtime writes invalidate caches correctly
- build mode performs no theme DB reads (assert via mocked DB call counts)

Regression:

- existing `tests/theme/theme-runtime.test.ts` extended
- add new tests under `tests/theme/`:
- `theme-engine-mode.test.ts`
- `theme-config-resolver.test.ts`
- `theme-registry-prepare.test.ts`

## 11) Documentation plan (when implementation starts)

- Update `docs/modules/08-themes.md` into dual-mode design (or split into:
- `08-themes-runtime.md`
- `10-themes-build-mode.md`)
- Update `docs/env-variables.md` with:
- `THEME_ENGINE_MODE`
- build area theme vars (`THEME_BUILD_ADMIN`, `THEME_BUILD_DASHBOARD`, `THEME_BUILD_FRONT`)
- Update `docs/platform-capabilities.md` and `docs/architecture-routing-actions.md`.
- Add migration guide for existing installs.

## Implementation phases

## Phase 0 - RFC and contracts

Tasks:

1. Define `ThemeManifest` + `ThemeConfigSchema` types.
2. Freeze naming for env variables and DB keys.
3. Define front route host strategy (`app/(front)` final layout contract).

Deliverables:

- Approved RFC markdown.
- Type contracts drafted.

Exit criteria:

- No unresolved naming or contract ambiguity.

## Phase 1 - Theme package infrastructure

Tasks:

1. Implement `themes:prepare` and generated registry.
2. Add first-party reference themes (`classic`, `marketing`) as packages.
3. Add registry integrity checks at startup.

Deliverables:

- Generated `lib/themes/external.generated.ts`.
- Validation errors fail early during prepare/build.

Exit criteria:

- App can compile with themes loaded only from registry.

## Phase 2 - Dual engine runtime

Tasks:

1. Implement mode resolver (`runtime|build`).
2. Integrate selection pipeline with area hosts (`admin/dashboard/front`).
3. Enforce build-mode DB bypass.

Deliverables:

- Theme selection service with deterministic source tracing.

Exit criteria:

- `build` mode works without theme DB reads.
- `runtime` mode preserves live switching behavior.

## Phase 3 - Runtime config schema and admin UX

Tasks:

1. Bind theme-specific runtime config forms to schema.
2. Validate write paths against active schema.
3. Add read-only behavior for build mode.

Deliverables:

- Dynamic admin editor for runtime-editable theme fields.

Exit criteria:

- Invalid config writes are rejected.
- Valid writes reflect live in runtime mode with cache invalidation.

## Phase 4 - Front area normalization

Tasks:

1. Reorganize public pages under `app/(front)` host.
2. Keep existing URLs unchanged.
3. Map front layout and slots to theme packages.

Deliverables:

- Single front host with theme-based composition.

Exit criteria:

- No URL regressions.
- Front theme switch works with same routing surface.

## Phase 5 - Hardening and rollout

Tasks:

1. Add test matrix for both modes.
2. Add observability metrics for mode, resolution source, cache hit/miss.
3. Prepare rollout flags and fallback procedure.

Deliverables:

- Full test coverage for resolver + caching + admin integration.
- Rollout runbook.

Exit criteria:

- Canary/staging validation passes.
- Production rollout checklist signed off.

## Dependencies

- Agreement on public route grouping (`app/(front)`).
- Final decision on whether auth pages remain in `(login)` or move behind front host.
- Env management policy for build-mode per environment.
- Availability of cache primitives compatible with Next 16 deployment topology.

## Blockers / risks

- Risk: schema drift between theme package config and DB-stored runtime overrides.
- Mitigation: strict schema versioning and validation at write/read.

- Risk: duplicated UI logic if themes over-customize page internals.
- Mitigation: enforce host + slots model; keep business pages shared.

- Risk: stale cache after admin updates.
- Mitigation: tag-based invalidation in every theme mutation action.

- Risk: migration complexity from current mixed front structure.
- Mitigation: route-by-route migration with compatibility checks.

## Completion criteria

1. Theme can change full visual/structural host per area from packaged code.
2. Engine mode switch is explicit and tested.
3. Build mode performs zero theme DB reads in request path.
4. Runtime mode supports live admin changes with bounded DB load via cache.
5. Public/front area is hosted from a single organized route group.
6. Docs and ops runbook reflect final architecture and rollout steps.

## Recommended execution order

1. Phase 0 and Phase 1 first (contracts + package infrastructure).
2. Phase 2 and Phase 3 second (mode engine + config UX).
3. Phase 4 and Phase 5 last (front migration + production hardening).
