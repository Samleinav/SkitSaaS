# Plan: SDK Events API + Hybrid Module Enablement

Status: In progress
Start date: 2026-02-19
Current phase: Design and contract alignment
Last review: 2026-02-19

## Objective
Implement a clearer module event API (`events.emit` / `events.on`) and a hybrid module enablement model where `core.config.ts` has priority over DB runtime state, while preserving backward compatibility.

## Scope
- Add ergonomic SDK event helpers with declarative registration for module manifests.
- Keep current event bus/runtime behavior compatible during migration.
- Add host-level module policy in `core.config.ts` and enforce hybrid enablement.
- Update runtime checks, scripts metadata, tests, and docs.

## Out of Scope
- Full removal of existing `emitEvent` / `emitEventAsync` in this cycle.
- Replacing `moduleId` with `name` as runtime identifier.
- Dynamic remote module loading.

## Priority Order
1. P0 - SDK event API (`events.emit` / `events.on`) with manifest-based handler registration.
2. P0 - Hybrid module enablement with `core.config.ts` priority.
3. P1 - Compatibility and validation hardening (`coreCompatibility`, peer/dependency policy, capability metadata).
4. P1 - Documentation and migration guidance.

## Task 1 (P0): Introduce declarative SDK events API

### Risk
Breaking existing module code that uses `emitEvent` / `emitEventAsync` directly or relies on current `ModuleEventHandler` shape.

### Target files
- `app/sdk/src/server.ts`
- `app/sdk/src/events/types.ts`
- `app/sdk/src/index.ts`
- `app/sdk/src/modules/manifest.ts`
- `lib/events/registry.ts`
- `lib/events/bus.ts`
- `lib/modules/sdk-server-bootstrap.ts`
- `tests/sdk/server-adapters.test.ts`
- `tests/events/event-bus.test.ts`

### Checklist
- [ ] Add `events` namespace export in SDK server:
  - `events.emit(hook, payload, { async?, context? })`
  - `events.on(hook, handler, { id, priority? })`
- [ ] Keep `emitEvent` and `emitEventAsync` as backward-compatible wrappers.
- [ ] Ensure `events.on(...)` returns a handler object compatible with `eventHandlers` in `ModuleManifest`.
- [ ] Keep runtime handler resolution based on enabled module manifests only.
- [ ] Keep handler execution ordering (`priority`, then `id`) unchanged.
- [ ] Keep queue fallback behavior unchanged (`async` queue if available, inline fallback).

### Validation checklist
- [ ] Existing event bus tests still pass.
- [ ] SDK adapter tests validate new `events` API and legacy wrappers.
- [ ] No regression in module manifest event handler contract.

### Commands
- `npx tsx --test tests/events/event-bus.test.ts`
- `npx tsx --test tests/sdk/server-adapters.test.ts`
- `pnpm exec tsc --noEmit`

## Task 2 (P0): Implement hybrid module enablement with `core.config.ts` priority

### Risk
Module runtime dispatch could diverge from operator expectations if core policy and DB state are not evaluated deterministically.

### Target files
- `core.config.ts` (new)
- `lib/modules/runtime.ts`
- `lib/modules/registry.ts`
- `scripts/modules-sync.ts`
- `lib/modules/external.generated.ts` (generated metadata consumer updates if needed)
- `tests/modules/module-runtime.test.ts`
- `docs/env-variables.md`
- `docs/modules/00-overview.md`

### Checklist
- [ ] Define host config contract in `core.config.ts`, including:
  - runtime mode (`db` | `config` | `hybrid`)
  - explicit module allowlist/blocklist behavior
  - optional per-module default state
- [ ] Implement final enablement rule for `hybrid`:
  - module is enabled only if allowed by `core.config.ts` and enabled in DB.
- [ ] Ensure area dispatchers (admin/dashboard/frontend/api) use final enablement evaluation.
- [ ] Ensure nav/widgets/provider registries respect final enablement evaluation.
- [ ] Add clear diagnostics/reason when module is disabled by core policy.
- [ ] Keep DB sync script behavior compatible (do not auto-enable modules blocked by core config).

### Validation checklist
- [ ] Runtime tests cover:
  - allowed in core + enabled in DB => enabled
  - blocked in core + enabled in DB => disabled
  - allowed in core + disabled in DB => disabled
- [ ] Route/page/API dispatch checks follow hybrid rule.
- [ ] Existing runtime behavior in default mode remains stable.

### Commands
- `npx tsx --test tests/modules/module-runtime.test.ts`
- `pnpm exec tsc --noEmit`

## Task 3 (P1): Compatibility and manifest/package hardening

### Risk
Inconsistent module contracts can pass build/prepare and fail only at runtime.

### Target files
- `scripts/modules-prepare.ts`
- `scripts/modules-build.ts`
- `app/sdk/src/modules/manifest.ts`
- `tests/modules/modules-prepare.test.ts`
- `tests/modules/modules-build.test.ts`
- `docs/sdk/00-overview.md`
- `docs/modules/13-source-package-template.md`

### Checklist
- [ ] Add `coreCompatibility` support in `module.json` validation flow.
- [ ] Define host core version source (recommended: root `package.json` field or explicit CLI/env override).
- [ ] Validate `coreCompatibility` similarly to `sdkRange` (strict/warn modes).
- [ ] Add build validation to fail when critical peer dependencies are also declared in `dependencies`.
- [ ] Harden missing `moduleId` behavior in scripts (explicit error instead of silent skip).
- [ ] Add capability metadata contract (`provides` / `requires`) to manifest validation (format + duplicates).

### Validation checklist
- [ ] Prepare/build tests cover missing/invalid/incompatible `coreCompatibility`.
- [ ] Build tests cover peer+dependency conflict errors.
- [ ] Prepare/build tests cover explicit failure on missing `moduleId`.
- [ ] Manifest validation tests cover capability metadata rules.

### Commands
- `npx tsx --test tests/modules/modules-prepare.test.ts`
- `npx tsx --test tests/modules/modules-build.test.ts`
- `npx tsx --test tests/modules/module-runtime.test.ts`
- `pnpm exec tsc --noEmit`

## Task 4 (P1): Documentation and migration rollout

### Risk
Module authors adopt mixed APIs and produce inconsistent manifests without clear migration guidance.

### Target files
- `docs/events-hooks.md`
- `docs/modules/00-overview.md`
- `docs/modules/01-manifest-registry.md`
- `docs/modules/13-source-package-template.md`
- `docs/sdk/00-overview.md`
- `docs/sdk/01-sdk-first-migration.md`
- `AGENTS.md`

### Checklist
- [ ] Document `events.emit` / `events.on` usage and legacy wrapper status.
- [ ] Document hybrid enablement precedence and `core.config.ts` contract.
- [ ] Document manifest capability fields and compatibility fields.
- [ ] Update module author checklist for `coreCompatibility` and peer/dependency guardrails.
- [ ] Add migration notes for legacy event API and compatibility timeline.
- [ ] Update `AGENTS.md` route/action/runtime conventions if contracts change.

### Validation checklist
- [ ] Docs reflect actual code contracts and script behavior.
- [ ] No doc references to obsolete event registration patterns.

### Commands
- `pnpm exec tsc --noEmit`
- `pnpm lint`

## Architecture Decisions (Locked)
- `moduleId` remains the canonical runtime identifier.
- `events.on(...)` is declarative and feeds `eventHandlers` in module manifest.
- Runtime registration remains manifest-driven; no global ad-hoc runtime handler registration.
- In `hybrid` mode, `core.config.ts` policy is authoritative over DB enable state.

## Open Questions
- [ ] Default runtime mode (`hybrid` vs `db`) for backward compatibility.
- [ ] Exact host core version source (`package.json` field name and override policy).
- [ ] Whether `module.json` should support `defaultEnabled` as a non-authoritative hint.

## Dependencies / Blockers
- Agreement on `core.config.ts` location and contract shape.
- Agreement on compatibility deprecation window for legacy event helpers.
- Alignment on strictness policy for `coreCompatibility` in CI.

## Completion Criteria
- New SDK event API is available and covered by tests.
- Hybrid enablement is enforced consistently across runtime dispatch surfaces.
- Build/prepare fail fast on malformed module contracts.
- Docs and agent guidance are updated to the new contract.
