---
title: Form Build System
description: Technical design and current implementation status for structured form and modal building across SDK, core, and modules.
sidebar_position: 2
---

# Form Build System

Status: Production default for standard core forms
Last review: 2026-03-12

This document explains the current `form build` system architecture for SkitSaaS and the remaining rollout boundaries.

A pilot implementation already exists in:

- `app/sdk/src/forms.ts`
- `app/sdk/src/form-validation.ts`
- `app/sdk/src/ui/build-form.tsx` — portable SDK renderer (fallback for source-package or host-free contexts)
- `lib/forms/runtime.ts`
- `lib/forms/validation/local.ts`
- `lib/forms/validation/results.ts`
- `lib/templates/ui-form.ts`
- `lib/templates/ui-form-payload.ts`
- `components/ui/build-form.tsx` — host renderer (shadcn + CTC, for core routes)
- `components/ui/build-modal.tsx`
- `components/ui/template-build-form.tsx`
- `app/(dashboard)/admin/users/create-user-form.tsx`
- `app/(dashboard)/admin/users/[userId]/page.tsx`
- `app/(dashboard)/admin/users/create-user-dialog.tsx`
- `modules/mod.example.suite/README.md`

Related execution plan:

- `plans/build-form-system.md`
- `plans/build-form-validation-layer.md`

## Why this exists

Current forms in core and modules are usually assembled directly in route components.

That gives flexibility, but it also creates repeated problems:

- inconsistent spacing and field composition between pages
- repeated `grid` and label/input boilerplate
- ad-hoc submit button behavior
- inconsistent confirm/delete dialogs
- no single contract that a module can target when building CRUD UI

The `form build` system is meant to standardize those parts without removing the ability to keep page-specific server actions and validation logic.

## Validation layer status

The validation layer is now split into two implementation states:

- implemented now:
  - canonical rule contract in `app/sdk/src/form-validation.ts`
  - normalized validation results (`valid`, `values`, `fieldErrors`, `formError`)
  - SDK-level validation message descriptors plus host-owned i18n resolvers
  - host-shared default validation catalogs in `lib/forms/validation/catalog.ts`
  - SDK-level `composeBuildFormDefinition(...)` helper for binding request, values, and submit config in one step
  - SDK-level `buildFormValidationPreset.blur(...)` helper for common CRUD validation defaults
  - browser-safe local validation runtime for common rules
  - `BuildForm` client integration for `blur`/`change` feedback and final local submit blocking
  - VineJS-backed server validation helper in `app/sdk/src/server.ts`
  - validated controller wrapper for reusable server actions in core and modules
  - `useActionState`-compatible validated actions that work both as native form actions and stateful form actions
  - generic `BuildForm` hydration of server validation results after submit
  - DB-aware server/preflight validation through a host resolver adapter
  - generic preflight endpoint at `app/api/forms/validate/route.ts`
  - field-level AJAX preflight from `BuildForm` with debounce/cancellation handling
  - optional host-owned preflight rate-limit hook with `429` / `Retry-After` support
  - no-JS submit fallback for confirm flows through `<noscript>` submit buttons
- intentionally left outside the default path:
  - highly dynamic collection editors that need richer field-array primitives
  - client-heavy flows that depend on custom client orchestration beyond standard submit/preflight/confirm behavior

Current local validation is intentionally limited to browser-safe rules.

`client.validateOn` currently controls eager field validation hooks (`blur` / `change`).
The renderer still runs one final local pass on submit whenever local rules exist, so enhanced submits do not accidentally bypass client validation.

Rules such as `unique` and `exists` are part of the shared contract, but they are not treated as authoritative on the client and still require the server-side layer.
`BuildForm` now uses `/api/forms/validate` for field-level preflight when `validation.preflight.enabled` is set and the form is registered for preflight.
Production deployments can also install a host-owned limiter through `configureBuildFormPreflightRateLimit(...)`; the core leaves that unconfigured by default so the host can choose Redis, CDN, WAF, or platform-native throttling without SDK lock-in.

The current server layer already validates common rules (`required`, `email`, `minLength`, `maxLength`, `integer`, `confirmed`, `accepted`, etc.) before mutation handlers run.
Validated actions now expose `useActionState`-compatible signatures, and `BuildForm` automatically uses that path when a validated action is attached to the form definition.

Generic parsing helpers such as `normalizeEmail(...)` and `parseOptionalPositiveInt(...)` now live in the SDK instead of route-local actions.
The host now also owns the default localized catalog for reusable validation keys (`build_form.validation.*`), so route/domain files only need to add business-specific messages on top.
Message ownership is split on purpose:

- SDK owns reusable message descriptors and English fallbacks
- host code resolves the final localized string for each descriptor
- route actions should keep only domain-specific validation decisions, not raw copy

The authoring layer also now has two repetition reducers:

- `composeBuildFormDefinition(...)` for applying `request`, `submit`, and `values` without repeating helper chains
- `buildFormValidationPreset.blur(...)` for the common `blur`-driven CRUD validation profile, with optional preflight defaults

That means the generic renderer can now:

- block obvious invalid submits locally
- submit the same action to the server for authoritative validation
- render `fieldErrors` / `formError` returned by the server without custom page glue

The current production rollout for that flow now covers:

- `/admin/users` create-user plus `/admin/users/[userId]` profile, status, and delete flows
- `/admin/app-config/general`
- `/admin/app-config/email`
- `/admin/app-config/payments-methods`
- `/admin/subscriptions/user/[userId]/edit`
- `/admin/subscriptions/organization/[teamId]/edit`
- `/admin/subscriptions/templates/create` subscription template create flow (uses `repeater`)
- `/admin/subscriptions/templates/[templateId]/edit` full template edit plus request-active-update and delete flows (uses `repeater`)
- `/admin/orders/create` manual order create flow (uses `dynamicOptions`)
- `/admin/orders/[orderId]/edit` order edit flow (uses `dynamicOptions`)
- `/dashboard/general` account update flow
- `/dashboard/security` password update and delete-account flows
- `/dashboard/subscriptions` user subscription cancel and organization subscription manage/cancel flows
- `/admin/account` now reuses the same dashboard account/password BuildForm definitions instead of bespoke client-side forms
- module pilot: `mod.example.suite`

The current DB-aware pilot is also `/admin/users`:

- `email` uses `unique(dbRef('core.users.email'))`
- `subscriptionTemplateId` uses `exists(dbRef('core.subscription_templates.user'))`
- preflight is enabled on `blur`
- the edit-profile flow uses `unique(dbRef('core.users.email'), { ignore: fieldRef('userId') })`
- the host registry now resolves both preflight metadata and the canonical submit action for these pilots
- `/admin/users/[userId]` status updates also run through the same controller registry + validated action path
- `/admin/users/[userId]` delete now uses a BuildForm confirm flow instead of a standalone form + confirm button pair
- `/admin/subscriptions/user/*` and `/admin/subscriptions/organization/*` now use the same registry + validated action path for user/team subscription management
- `/admin/subscriptions/templates/[templateId]/edit` now routes auxiliary update/delete actions through BuildForm instead of standalone forms

## Standard boundary

BuildForm is now the default production path for:

- CRUD forms with stable field sets
- settings/configuration forms
- destructive confirms
- hidden-id mutation forms
- server-rendered dashboard/admin account and subscription settings

BuildForm is not mandatory for every route.

Current intentional exceptions in core are:

- `app/(dashboard)/dashboard/home-core.tsx`
  - still uses client-heavy `useActionState`, SWR, and custom radio-group/notification orchestration

Those routes are not blockers for production readiness of the BuildForm system itself.

## Design goals

- Keep server actions and route validations in their current domain files.
- Let forms describe request target, layout, fields, and submit behavior from one definition.
- Support both core routes and modules.
- Reuse the existing Component Template Controller (CTC) and theme runtime instead of adding a parallel theming system.
- Provide a safe path for prefilling edit forms from server-loaded data.
- Reuse existing modal contracts:
  - `ui.dialog` for custom modal content
  - `ui.alert-dialog` for confirm/delete flows

## Layered architecture

The architecture is intentionally split into four layers.

### 1. SDK contract

The SDK layer defines the portable contract used by both core and modules, and now ships a self-contained portable renderer.

Current responsibilities:

- `BuildFormDefinition`, `BuildFormFieldDefinition`, `BuildFormSectionDefinition`, `BuildModalDefinition`
- builder helpers such as `defineBuildForm(...)`
- prefill helpers such as `withBuildFormValues(...)`
- mask helpers for normalized input behavior
- validation helpers (`validateBuildFormLocally`, `getBuildFormValidation`, `shouldRunBuildFormPreflight`, etc.)
- `BuildForm` — portable client renderer exported from `@skitsaas/sdk`

`BuildForm` in the SDK renders using plain Tailwind (`bg-background`, `border-input`, etc.) and supports all current field types (including `repeater`), responsive grid layout, blur/change validation, server validation hydration via `useActionState`, and field-level preflight AJAX to `/api/forms/validate`.

Current renderer boundary:

- the portable SDK renderer covers the full form contract and validation lifecycle including `repeater` rows, `dynamicOptions`, masks, and `disableWhen`
- the richer submit UX (`successLabel`, themed submit button, confirm modal rendering) lives in the host renderer only
- use the host renderer for core routes and for any host-owned wrapper that needs exact host visual parity

The `templateRenderer` prop lets the host or theme inject a fully custom renderer at call time:

```tsx
import { BuildForm } from '@skitsaas/sdk';

// default — uses SDK's own Tailwind renderer
<BuildForm definition={form} area="frontend" />

// override — host/theme injects shadcn-based renderer
<BuildForm definition={form} area="frontend" templateRenderer={hostRenderer} />
```

The SDK renderer calls `useFormStatus()` from `react-dom` for pending state, so `react-dom` is now a peer dependency of `@skitsaas/sdk`.

The SDK contract must stay host-agnostic.

That means:

- no direct dependency on `@/components/*`
- no assumption that a module is `source-host`
- no hidden dependency on route-local state shape

### 2. Host runtime in `lib/*`

The host layer translates the SDK contract into a renderable and testable runtime.

Current responsibilities:

- layout normalization
- field value resolution
- payload normalization for template data
- CTC resolution for `ui.form`
- host-only controller resolution for `formId -> definition + submitAction + access`

Current files:

- `lib/forms/runtime.ts`
- `lib/forms/db-registry.ts`
- `lib/forms/preflight.ts`
- `lib/forms/registry.ts`
- `lib/forms/security.ts`
- `lib/templates/ui-form.ts`
- `lib/templates/ui-form-payload.ts`

### 3. Reusable UI renderers

Two renderers exist. The right choice depends on where the form is used.

#### SDK renderer — `@skitsaas/sdk` → `BuildForm`

Used by source-package modules and other portable host-free contexts. In this repository, source-host modules normally use the host renderer directly.

```tsx
import { BuildForm } from '@skitsaas/sdk';
```

Self-contained. No host imports. Renders with plain Tailwind CSS variables (`bg-background`, `border-input`, `text-foreground`, etc.) which resolve correctly when the host's CSS variables are on the page. The host or theme can replace the entire output with a `templateRenderer` prop.

#### Host renderer — `components/ui/build-form.tsx`

Used by core routes (`app/(dashboard)/admin/*`, `app/(dashboard)/dashboard/*`).

```tsx
import { BuildForm } from '@/components/ui/build-form';
// or, with CTC resolution:
import { TemplateBuildForm } from '@/components/ui/template-build-form';
```

Depends on shadcn components (`Input`, `Button`, `Label`, `BuildModal`, `ThemedAsyncSubmitButton`) and the host CTC payload (`ui.form`). Not suitable for module code.

Current host renderer files:

- `components/ui/build-form.tsx`
- `components/ui/build-modal.tsx`
- `components/ui/template-build-form.tsx`

### 4. Theme and template integration

The system stays aligned with the current template architecture.

Current CTC behavior:

- include `ui.form` as a template component id
- allow theme/module payload overrides for form-level classes
- keep `ui.dialog` and `ui.alert-dialog` as the modal-level theme hooks

This keeps the form system compatible with:

- core defaults
- theme overrides
- module defaults and overrides

## Current form definition model

The planned authoring model is a single form definition with a small number of predictable concepts:

- request target
- global layout
- sections
- fields
- submit behavior
- optional confirm behavior
- optional prefilling

Illustrative example:

```ts
const form = defineBuildForm({
  id: 'admin-create-user',
  title: 'Create user',
  description: 'Creates a user and optional subscription assignment.',
  request: {
    action: createUserAction,
    method: 'post'
  },
  layout: {
    columns: 2
  },
  fields: [
    buildFormField.text({
      name: 'name',
      label: 'Name',
      placeholder: 'Jane Doe'
    }),
    buildFormField.email({
      name: 'email',
      label: 'Email',
      required: true
    }),
    buildFormField.password({
      name: 'password',
      label: 'Password',
      required: true
    }),
    buildFormField.select({
      name: 'role',
      label: 'Role',
      defaultValue: 'member',
      options: [
        { value: 'member', label: 'Member' },
        { value: 'owner', label: 'Owner' },
        { value: 'admin', label: 'Admin' }
      ]
    })
  ],
  submit: {
    idleLabel: 'Create',
    pendingLabel: 'Creating...'
  }
});
```

Notes about this model:

- the definition owns the request target
- the definition stays mostly serializable
- field shape stays flat and predictable
- page-level validation still belongs to the server action
- local validation can now be attached to the same definition through `withBuildFormValidation(...)` or `defineValidatedBuildForm(...)`
- preflight can now be attached through `validation.preflight`

## Current field capabilities

Current supported field types:

- `hidden`
- `text`
- `email`
- `password`
- `tel`
- `url`
- `date`
- `number`
- `textarea`
- `select` — supports static `options` or server-loaded `optionsKey` (see Dynamic options)
- `checkbox`
- `repeater` — dynamic add/remove row table with typed sub-fields (see Repeater field)

Shared field options (on most field types):

- `name`
- `label`
- `description`
- `placeholder`
- `required`
- `disabled`
- `readOnly`
- `defaultValue`
- `colSpan`
- `className`
- `inputClassName`
- `mask` — normalized input behavior (`digits`, `decimal`, `currency`, `phone`, `slug`, `upper`, `lower`)

## Dynamic options for `select`

When select options must be loaded from the database at request time, use `optionsKey` instead of inline `options`:

```ts
buildFormField.select({
  name: 'teamId',
  label: 'Team',
  optionsKey: 'teamOptions'
})
```

Pass the resolved options at compose time through `dynamicOptions`:

```ts
composeRegisteredBuildFormDefinition('my-form', baseForm, {
  dynamicOptions: {
    teamOptions: teams.map((t) => ({ value: t.id, label: t.name }))
  }
})
```

The renderer resolves `optionsKey` against `definition.dynamicOptions` at render time. This keeps the form definition serializable while still supporting DB-driven option lists.

Helper: `withBuildFormDynamicOptions(definition, dynamicOptions)` for manual composition.

## Repeater field

Use `repeater` for dynamic tables where the user can add and remove rows, each with multiple sub-fields.

```ts
buildFormField.repeater({
  name: 'featureRowId',        // name used for the hidden row-ID inputs
  addLabel: 'Add feature',
  removeLabel: 'Remove',
  minRows: 1,
  emptyRow: { featureValueType: 'text', featureIsPublic: true },
  subFields: [
    { name: 'featureKey', kind: 'text', label: 'Key', placeholder: 'e.g. seats' },
    { name: 'featureLabel', kind: 'text', label: 'Label' },
    { name: 'featureValueType', kind: 'select', label: 'Type', options: valueTypeOptions },
    {
      name: 'featureValue', kind: 'text', label: 'Value',
      disableWhen: { field: 'featureValueType', equals: 'null' }
    },
    { name: 'featureIsPublic', kind: 'checkbox', label: 'Public' }
  ]
})
```

Sub-field kinds: `text`, `number`, `select`, `checkbox`.

`disableWhen` disables a sub-field when a sibling sub-field in the same row equals a given value.

**FormData serialization:**
- `featureRowId` — multiple values, one per row (the row IDs)
- `featureKey_{rowId}`, `featureValueType_{rowId}`, etc. — one value per sub-field per row

**Server-side reading** (same pattern already used by `parseTemplateFeatures` in subscriptions):
```ts
const rowIds = formData.getAll('featureRowId').map(String);
for (const rowId of rowIds) {
  const key = formData.get(`featureKey_${rowId}`);
  // ...
}
```

**Preloading rows** for edit forms:
```ts
composeRegisteredBuildFormDefinition('my-form', baseForm, {
  repeaterRows: {
    featureRowId: template.features.map((f) => ({
      id: String(f.id),
      featureKey: f.key,
      featureValueType: f.valueType,
      featureIsPublic: f.isPublic
    }))
  }
})
```

Helper: `withBuildFormRepeaterRows(definition, repeaterRows)` for manual composition.

## Current runtime model

Validation now runs in three layers:

1. `local`
   - browser-safe rules only
   - runs in `BuildForm` on `blur`, `change`, and final `submit`
2. `preflight`
   - optional AJAX call to `/api/forms/validate`
   - intended for DB-aware rules and server-only checks
   - field-level by default in the current pilot
3. `server`
   - authoritative validation in the final server action
   - runs before mutation logic

Current rule behavior:

- common rules (`required`, `email`, `minLength`, `confirmed`, etc.) run locally and on the server
- DB rules (`unique`, `exists`) run in preflight and on the server
- DB rules fail closed if the host has no resolver for the requested `dbRef(...)`

When not to use preflight:

- do not enable it for forms that only need browser-safe rules
- do not enable it for secrets or credential fields where field-by-field network validation adds no UX value
- do not enable it for high-churn fields unless the check is cheap and intentionally `blur`-driven
- do not treat it as a replacement for the final server validation pass

## Current host registry model

The current host implementation uses one metadata catalog plus two registries:

- controller catalog: `lib/forms/registry-catalog.ts`
  - source of truth for `formId`, area, access scope, route, and definition factory
  - keeps registry coverage testable without importing route actions
- form registry runtime: `lib/forms/registry.ts`
  - consumes the controller catalog
  - attaches the canonical submit action for adopted forms

- DB resolver registry: `lib/forms/db-registry.ts`
  - resolves serializable `dbRef(...)` targets to host query handlers
  - currently includes `core.users.email` and `core.subscription_templates.user`

Current core controllers:

- `admin-create-user-form`
- `admin-edit-user-profile-form`
- `admin-update-user-status-form`
- `admin-delete-user-form`
- `admin-app-config-general-form`
- `admin-create-order-form`
- `admin-edit-order-form`
- `admin-create-subscription-template-form`
- `admin-edit-subscription-template-form`
- `admin-request-template-active-update-form`
- `admin-delete-subscription-template-form`
- `admin-update-user-subscription-form`
- `admin-manage-organization-subscription-form`
- `admin-clear-organization-subscription-form`
- `dashboard-update-account-form`
- `dashboard-update-password-form`
- `dashboard-delete-account-form`
- `dashboard-cancel-user-subscription-form`
- `dashboard-manage-organization-subscription-form`

The SDK server runtime consumes DB lookups through `configureBuildFormDbValidation(...)`, which is wired from `lib/modules/sdk-server-bootstrap.ts`.

Registration checklist for new production forms:

- every form with `validation.preflight.enabled` must have an entry in `lib/forms/registry-catalog.ts`
- the host runtime must expose that catalog entry through `lib/forms/registry.ts`
- every shipped `dbRef(...)` target must be resolved in `lib/forms/db-registry.ts`
- missing resolvers are expected to fail closed on the server and return a validation error
- prefer `composeRegisteredBuildFormDefinition(...)` or `composeBuildFormDefinition(...)` instead of rebuilding request and prefill glue on each page

Current verified production targets:

- preflight-enabled core forms:
  - `admin-create-user-form`
  - `admin-edit-user-profile-form`
  - `dashboard-update-account-form`
- active core DB targets:
  - `core.users.email`
  - `core.subscription_templates.user`

## Operational behavior

The host now exposes lightweight observability for the two most important runtime signals:

- blocked preflight requests
- missing DB resolver targets

Current host wiring:

- `lib/forms/observability.ts` defines the host-side observation contract
- `lib/modules/sdk-server-bootstrap.ts` installs the default observer into system activity logs
- `lib/forms/preflight.ts` emits `build_form.preflight.rate_limited`
- `lib/forms/db-registry.ts` emits `build_form.db_resolver.missing`

Operational guidance:

- inspect `/admin/logs` for `eventCategory='forms'`
- look for `build_form.preflight.rate_limited` when users report intermittent AJAX validation failures
- look for `build_form.db_resolver.missing` when a `dbRef(...)` rule fails closed at runtime
- the default logs intentionally include only `formId`, `field`, `target`, `runtime`, route metadata, request id, and IP when available
- submitted field values are not written to logs by default

Validation command path:

- use `pnpm check:buildform` for the focused BuildForm regression suite
- use the full repo suite only when you also want DB-backed domains such as auth or payments

Progressive degradation:

- `BuildForm` always renders a native `<form>` contract
- local validation and preflight are progressive enhancement only
- validated actions remain the final server-side gate
- confirm flows now emit a `<noscript>` submit fallback so JS-disabled browsers can still submit destructive forms

## Recommended rollout order

Use the same migration order in core and modules so validation, UX, and observability land in the least risky sequence:

1. `create`
   - easiest place to standardize request, layout, local validation, and server validation
   - add preflight only when a real DB-aware rule exists
2. `edit/profile`
   - reuse the same base definition with prefills
   - add `fieldRef(...)` and `ignore current record` rules where needed
3. `settings/update`
   - migrate grouped settings pages next, especially when they still duplicate section/layout glue
4. `delete/confirm`
   - move destructive flows to BuildForm confirm patterns once the validated action path is already in place
5. `client-heavy legacy forms`
   - only after the previous flows are stable, migrate screens that still have route-local client state or custom action-state UX

Core examples of that order already shipped:

- `create`: `/admin/users`
- `edit/profile`: `/admin/users/[userId]`, `/dashboard/general`
- `settings/update`: `/dashboard/subscriptions`
- `delete/confirm`: `/admin/users/[userId]`, `/dashboard/security`

Recommended field-specific options:

- `options` for `select`
- `rows` for `textarea`
- `min`, `max`, `step` for `number`
- `checkedValue` / `uncheckedValue` for `checkbox` when explicit false-style values are needed

## Grid and section model

The system should standardize layout decisions instead of re-encoding them on every page.

Current layout features:

- global `columns` on the form
- optional per-section `columns`
- `colSpan` per field
- section `title` and `description`

This allows common admin/dashboard layouts such as:

- simple one-column settings forms
- two-column edit forms
- grouped settings sections with their own headings

## Prefill model

Edit and settings pages need a predictable way to inject data before render.

Recommended flow:

1. Route/page loads data on the server.
2. The page builds the form definition.
3. The page applies values through a helper such as `withBuildFormValues(...)`.
4. The renderer uses those values as initial field state.

Illustrative example:

```ts
const form = withBuildFormValues(baseEditForm, {
  title: item.title,
  description: item.description ?? '',
  status: item.status,
  priority: item.priority,
  isPublic: item.isPublic
});
```

This is the main answer to the requirement of “pass data to the form before render”.

## Submit and request model

The definition should describe where the form submits from the same place the fields are declared.

Current request shape:

- `action`
- `method`
- `encType` when needed

Recommended submit shape:

- `idleLabel`
- `pendingLabel`
- `successLabel`
- `variant`
- `size`
- optional secondary actions
- optional confirm modal config

The host renderer should continue to reuse the platform submit behavior instead of inventing a new pending-state mechanism.

That means in the host renderer:

- standard submit path uses `AsyncSubmitButton`
- confirm/delete path reuses alert-dialog behavior

The portable SDK renderer keeps the same validation and native form contract, but its default submit UI is intentionally simpler than the host renderer.

## Modal model

The system currently covers two modal use cases.

### Custom modal

Use this for dialogs that contain arbitrary content, including full forms.

Current integration:

- `BuildModal` with `kind: 'dialog'`
- visual/theming hook through `ui.dialog`

Typical use cases:

- create user dialog
- module-specific create/edit modal
- settings helper modal

### Confirm/delete modal

Use this for destructive or confirmation flows.

Current integration in the host renderer:

- `BuildModal` with `kind: 'confirm'`
- or `submit.confirm` inside a form definition
- visual/theming hook through `ui.alert-dialog`

Typical use cases:

- delete item
- confirm status change
- confirm irreversible action

## CTC integration

The `form build` system should use the existing template controller rather than bypass it.

Current CTC id:

- `ui.form`

Current payload shape for `ui.form`:

```json
{
  "formClassName": "space-y-6",
  "headerClassName": "space-y-1",
  "titleClassName": "text-lg font-semibold",
  "descriptionClassName": "text-sm text-muted-foreground",
  "sectionClassName": "space-y-4",
  "gridClassName": "grid gap-4",
  "fieldClassName": "space-y-2",
  "labelClassName": "text-sm font-medium",
  "descriptionTextClassName": "text-xs text-muted-foreground",
  "inputClassName": "h-9",
  "textareaClassName": "min-h-24",
  "selectClassName": "h-9",
  "checkboxWrapperClassName": "flex items-start gap-3",
  "actionsClassName": "flex flex-wrap gap-2"
}
```

Important boundary:

- `ui.form` should own form layout styling
- `ui.dialog` should own custom modal styling
- `ui.alert-dialog` should own confirm modal styling

## Module strategy

This project uses **source-host modules exclusively**. Source-host modules compile inside the host app and have full access to `@/components/*`, `@/lib/*`, and all host infrastructure.

### source-host modules

Use the host renderer directly. This gives full parity with core routes: shadcn components, `successLabel`, confirm modals, CTC theming, and `ThemedAsyncSubmitButton`.

```tsx
import { BuildForm } from '@/components/ui/build-form';
// or with CTC resolution:
import { TemplateBuildForm } from '@/components/ui/template-build-form';

// portal page or dashboard module page
<BuildForm definition={form} area="frontend" />
```

The form definition contract (`defineBuildForm`, `buildFormField.*`, `withBuildFormValues`, validation helpers, etc.) still comes from `@skitsaas/sdk` — the SDK owns the authoring layer. Only the renderer comes from the host.

```tsx
// definition — from SDK
import { defineBuildForm, buildFormField } from '@skitsaas/sdk';

// renderer — from host
import { BuildForm } from '@/components/ui/build-form';
```

### source-package modules (not used in this project)

For completeness: source-package modules compiled outside the host cannot import from `@/`. They use the SDK portable renderer:

```tsx
import { BuildForm } from '@skitsaas/sdk';
```

The SDK renderer covers the full validation lifecycle but omits host-only visual extras (`successLabel`, confirm modal, CTC payload).

## Rollout status

### Phase 1

- completed: SDK contract
- completed: host runtime
- completed: `ui.form` CTC integration
- completed: reusable renderers

### Phase 2

- completed: one core form migrated
- completed: one core custom dialog migrated
- completed: module create/edit/delete/settings pilot migrated

### Phase 3

- completed: broader rollout across admin/dashboard forms (orders, subscriptions)
- completed: `dynamicOptions` / `optionsKey` for DB-loaded select options
- completed: `repeater` field type for dynamic row tables
- completed: host-side observability for preflight abuse signals and resolver misses
- pending: migration guidance for legacy forms with custom action-state UX
- pending: richer masks only after real use cases appear

## New validated form checklist

Use this list for every new BuildForm intended for production:

1. define a stable `formId`
2. attach validation with `withBuildFormValidation(...)` or `defineValidatedBuildForm(...)`
3. wire the submit path through a validated action
4. if `preflight` is enabled, add the form to `lib/forms/registry-catalog.ts` so the host runtime can expose it through `lib/forms/registry.ts`
5. if the form uses `dbRef(...)`, add or confirm the matching host resolver in `lib/forms/db-registry.ts`
6. prefer `composeRegisteredBuildFormDefinition(...)` or `composeBuildFormDefinition(...)` instead of manual request glue
7. keep only business-specific errors in the route action and resolve generic validation copy through the host catalog
8. verify the flow with JS enabled and with JS disabled

Module-specific rule (source-host):

- form definitions and validation helpers come from `@skitsaas/sdk`
- renderer comes from `@/components/ui/build-form` (host renderer, full parity with core)
- registry wiring, DB resolver ownership, i18n catalogs, and observability stay in the host

## Non-goals for v1

The first version should not try to solve every form problem.

Do not make v1 depend on:

- a full client validation engine
- dynamic wizard navigation
- schema inference from database models
- complete parity with every legacy inline form

## Documentation rule

Once implementation starts, this document should be updated to separate:

- current implemented API
- planned future extensions

If runtime contracts change, also update:

- `docs/sdk/00-overview.md`
- `docs/themes/03-template-controller.md`
- `docs/reference/05-sdk-changelog.md`
