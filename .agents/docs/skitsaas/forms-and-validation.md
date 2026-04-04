---
title: "Forms And Validation"
sidebar_position: 0
---

# Forms And Validation

BuildForm is a platform system, not just a convenience component.

If a task involves CRUD forms, settings forms, confirmation flows, or
server-validated admin/dashboard mutations, start here before building a custom
form stack.

## Core Mental Model

BuildForm is layered:

1. SDK contract
2. host renderer and adapters
3. controller registry and submit action mapping
4. validation pipeline
5. optional template resolution through `ui.form`

## Contract Layer

Key files:

- `app/sdk/src/forms.ts`
- `app/sdk/src/form-validation.ts`
- `app/sdk/src/ui/build-form.tsx`
- `app/sdk/src/ui/template-build-form.tsx`

Main concepts:

- `BuildFormDefinition`
- field and section definitions
- request metadata
- submit metadata
- local validation rules
- `TemplateBuildForm` for host-aware template resolution

## Host Layer

Key files:

- `components/ui/build-form.tsx`
- `components/ui/template-build-form.tsx`
- `components/ui/sdk-build-form-provider.tsx`
- `lib/templates/ui-form.ts`

Inside SkitSaaS, SDK forms can upgrade into the host renderer through the build
form provider and template resolution bridge.

## Registry And Submit Mapping

Key files:

- `lib/forms/registry.ts`
- `lib/forms/registry-catalog.ts`
- `lib/forms/definition.ts`

Important behavior:

- registered forms map a `formId` to area, access, definition, and submit action
- `buildFormControllerSubmitActions` is the canonical mapping for controller-wrapped
  server actions in core flows
- `composeRegisteredBuildFormDefinition(...)` binds the registered request
  automatically

## Validation Layers

There are three validation stages:

1. local browser-safe validation
2. optional preflight validation via `/api/forms/validate`
3. authoritative server validation before mutation

Key files:

- `lib/forms/validation/local.ts`
- `lib/forms/validation/server.ts`
- `lib/forms/security.ts`
- `lib/forms/preflight.ts`
- `app/api/forms/validate/route.ts`

## Security And Access

BuildForm preflight checks:

- same-origin request
- valid registered form
- area and access scope
- optional rate-limit behavior

Server action safety still depends on controller wrappers.

For core admin/dashboard actions, use the correct area controller.
For modules, use SDK server helpers rather than host-only `adminAction` or
`dashboardAction`.

## When To Use BuildForm

Prefer BuildForm for:

- stable CRUD forms
- settings forms
- delete and confirm flows
- hidden-id mutation forms
- server-rendered admin and dashboard forms

## When To Be Careful

BuildForm is not the default for every client-heavy workflow. If a route already
depends on heavy client orchestration, BuildForm may not be the best fit.

## Common Mistakes

- manually wiring a form that already belongs in the registry
- skipping controller-wrapped server actions
- forgetting preflight is a separate API security path
- using host-only imports inside `source-package` module form code
- ignoring `TemplateBuildForm` and `ui.form` when the area uses CTC
