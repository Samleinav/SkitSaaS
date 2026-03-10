---
name: module-boundary-guard
description: Enforce strict module boundaries: no direct imports from host core (e.g. @/app, @/lib, @/components) inside modules. Use @skitsaas/sdk contracts first; if capability is missing, plan an SDK extension before implementing the module feature.
---

# Module Boundary Guard

Use this skill when building or reviewing files under `modules/*`.

## Objective

Keep modules portable and host-agnostic.

A module must not depend on host internals.

## Hard Rules

1. Do not import host aliases inside modules:
- forbidden examples: `@/app/*`, `@/lib/*`, `@/components/*`, `@/config/*`

2. Allowed imports in modules:
- module-local paths: `./*`, `../*`
- SDK contracts: `@skitsaas/sdk`, `@skitsaas/sdk/server`, `@skitsaas/sdk/db`
- standard third-party packages only when truly module-owned

3. If a required capability exists only in core:
- stop module implementation
- add an SDK contract proposal in plan/checklist
- implement or request SDK extension first
- then consume the new SDK contract from the module
- register the SDK-gap/change in `docs/reference/05-sdk-changelog.md`
- if the task also includes module/business work, isolate the SDK/core part in its own commit so it can be cherry-picked to `v1` without module noise

4. UI fallback behavior (`NoContext`, onboarding, empty states) must be implemented inside the module, not imported from host pages.

## Required Checks Before Commit

Run these checks after every module change:

```bash
rg -n "from '@/|from \"@/" modules/<moduleId>
rg -n "@/app|@/lib|@/components|@/config" modules/<moduleId>
pnpm exec tsc --noEmit
```

Acceptance for boundary checks:
- first 2 commands return no matches
- typecheck passes

## Code Review Checklist

- [ ] Module files avoid host imports.
- [ ] Module uses SDK contracts for auth/db/actions/runtime integration.
- [ ] Any missing capability is listed as an SDK-gap task in plans.
- [ ] Module still works with host runtime disabled or feature-flagged (clear fallback path).

## Planning Requirement

For every sprint touching modules, include a section:

`Module Boundary Gate (Mandatory)`

Minimum content:
- forbidden import policy
- SDK-first policy
- command checklist using `rg` + `tsc`
- rule for SDK-gap escalation

## SDK Gap Logging (Mandatory)

Every SDK-gap or SDK contract change must be recorded in:

`docs/reference/05-sdk-changelog.md`

Minimum fields:
- date
- sprint
- module
- summary
- sdk surface
- status (`pending_publish` or `published`)
