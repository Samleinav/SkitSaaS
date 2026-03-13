---
name: skitsaas-core-or-module
description: Decide whether a SkitSaaS request belongs in module code or shared core/sdk, then execute with the correct boundaries, docs-first workflow, and commit split. Use when asked to create a module, extend host runtime, close an SDK gap, or combine shared platform work with module/product changes.
---

# skitsaas-core-or-module

Use this skill before implementing any request that could touch either
`modules/*` or shared host/runtime files.

## Goal

Prevent two common mistakes:

- implementing module/product work inside shared core files
- mixing reusable core/sdk changes with module/business changes in one commit

## Required docs-first pass

Read only what the task needs, in this order:

1. `docs/00-documentation-index.md`
2. `docs/extensions/module-development-index.md`
3. `docs/modules/00-overview.md`
4. `docs/sdk/00-overview.md`
5. `docs/sdk/01-sdk-first-migration.md`
6. `docs/forms/02-sdk-vs-source-host.md` when form or UI parity matters

If the task targets a specific module, then read:

- `modules/<moduleId>/README.md`
- `modules/<moduleId>/docs/*` only when needed

## Decision flow

1. Classify the request.
   - If it is specific to one module under `modules/<moduleId>`, treat it as
     module work.
   - If it adds a reusable platform capability, treat it as `core/sdk`.
2. For a new module, decide the mode before proposing structure.
   - Ask for `source-host` or `source-package` if the user did not specify it.
   - Do not assume silently.
3. For an existing module, prefer SDK-first imports.
   - Use SDK contracts first.
   - Use host imports only when the task is intentionally `source-host` and the
     SDK does not yet cover the capability.
   - BuildForm and `TemplateBuildForm` no longer need host imports for normal
     module parity inside SkitSaaS.
4. If module work exposes a reusable gap, stop the shortcut.
   - Switch to `core-sdk-evolution`.
   - Add the shared contract first.
   - Resume module work only after the shared surface exists.

## Choose `module` when

- the work is module-owned routing, pages, APIs, config, widgets, i18n, or DB
  logic
- the feature is business-specific and does not require a new shared host
  contract
- the change should live entirely under `modules/<moduleId>/`

## Choose `core/sdk` when

- the change adds or modifies a public SDK export
- the runtime or proxy behavior changes for multiple modules or host areas
- the work changes shared BuildForm, DataTable, i18n, auth, event, payment, or
  subscription behavior
- the change should be upstreamed or cherry-picked without module-specific noise

## Module mode rules

- Do not choose a new module mode silently. Ask for `source-host` vs
  `source-package` when it is not specified.
- `source-package` must stay SDK-only.
- `source-host` may use host internals only after an SDK-first check.
- Even in `source-host`, keep routing, actions, config, and data contracts as
  SDK-first as possible.
- BuildForm and `TemplateBuildForm` should stay on SDK imports for normal
  module code.

## Companion skills

- `skss-module-authoring` for module implementation
- `core-sdk-evolution` when the SDK surface is missing
- `core-routing-runtime` for shared routing/proxy changes
- `core-ui-systems` for shared form/datatable/i18n runtime changes
- `core-security-auth` for auth/provider/user-context changes
- `core-payments-subscriptions` for shared billing/subscription lifecycle work

## Commit split rule

If a task changes both shared runtime/SDK and module/product behavior:

1. commit core/sdk/docs/tests first
2. commit module/product changes second

Do not mix them when the shared change is intended to be cherry-picked into
another branch or upstreamed to `v1`.

## Verification baseline

Run the checks that match the touched area:

```bash
pnpm exec tsc --noEmit
pnpm modules:prepare
pnpm modules:i18n
```

If a module was touched, also run the boundary checks from
`skss-module-authoring/references/verification.md`.

## Stop conditions

- Docs and implementation disagree: call out the conflict and verify before
  editing.
- A new module request has no mode yet: ask for `source-host` vs
  `source-package`.
- The needed capability belongs in the SDK or shared runtime: do not hide it
  behind a module-local shortcut.
