---
title: "Admin CRUD Playbook"
sidebar_position: 0
---

# Admin CRUD Playbook

Use this page when the task is not just "what is BuildForm?" or "what is
BuildTable?", but "how do I actually build a platform-style CRUD screen in
SkitSaaS without inventing a parallel stack?"

This page gives the end-to-end recipe that the shorter overview docs do not.

## When To Use This

Use this playbook for:

- admin CRUD screens
- dashboard CRUD or settings screens with the same platform primitives
- routes that need a form, validation, server action, list view, row actions,
  and theme-aware rendering
- features that also need plan or quota gating

## The Recommended Stack

For a standard admin CRUD screen, the recommended platform path is:

1. BuildForm definition in a route-local `forms.ts`
2. controller-wrapped server action in `actions.ts`
3. BuildForm registry entry in `lib/forms/registry-catalog.ts`
4. submit action mapping in `lib/forms/registry.ts`
5. route component rendering through `TemplateBuildForm`
6. BuildTable or host table adapter for the list view
7. CTC-aware rendering for `ui.form`, `ui.table`, and confirm/submit UI

If the behavior depends on subscription features:

8. evaluate plan/feature state in the controller or server layer, not only in
   the React component

## Canonical Core Example

The best current core example is the admin users flow:

- form definition:
  `app/(dashboard)/admin/users/forms.ts`
- controller-wrapped actions:
  `app/(dashboard)/admin/users/actions.ts`
- registered form renderer:
  `app/(dashboard)/admin/users/create-user-form.tsx`
- route page:
  `app/(dashboard)/admin/users/page.tsx`
- form registry catalog:
  `lib/forms/registry-catalog.ts`
- submit action mapping:
  `lib/forms/registry.ts`
- table definition and columns:
  `app/(dashboard)/admin/users/columns.tsx`

## Step 1: Define The Form Contract

Define the form in `forms.ts` using SDK form helpers, not ad-hoc JSX-only form
assembly.

Typical building blocks:

- `defineBuildForm(...)`
- `buildFormField.*`
- `withBuildFormValidation(...)`
- `buildFormValidationPreset.blur(...)`
- DB-aware rules such as `unique(dbRef(...))` or `exists(dbRef(...))`

The admin users example shows the expected style:

- keep copy and options injectable
- give the form a stable `id`
- keep the validation contract next to the form definition

## Step 2: Wrap The Mutation In The Correct Controller

For core admin mutations, use:

- `adminAction`
- `adminValidatedAction`

For dashboard mutations, use:

- `dashboardAction`
- `dashboardValidatedAction`

Why this matters:

- page access is not enough authorization
- controller wrappers enforce server-side auth before mutation logic runs
- validated variants pair naturally with BuildForm definitions

Current controller entrypoints:

- `app/(dashboard)/admin/controller.ts`
- `app/(dashboard)/dashboard/controller.ts`

## Step 3: Register The Form For Runtime Resolution

If the form is part of the core BuildForm registry flow, wire it in two places:

1. `lib/forms/registry-catalog.ts`
   - add `formId`, `area`, `access`, `route`, and `resolveDefinition`
2. `lib/forms/registry.ts`
   - map that `formId` to the controller-wrapped submit action

This is what lets the runtime resolve:

- the canonical request action
- preflight metadata
- access scope
- route-aware form behavior

### Copyable Registry Wiring

The real host pattern looks like this:

```ts
// lib/forms/registry-catalog.ts
{
  formId: 'admin-create-user-form',
  area: 'admin',
  access: 'admin',
  route: '/admin/users',
  resolveDefinition: () => createAdminCreateUserBuildFormBase()
}
```

```ts
// lib/forms/registry.ts
const buildFormControllerSubmitActions = {
  'admin-create-user-form': createUserAction
} as const;
```

If a CRUD form needs preflight and registered request behavior, this wiring is
usually the exact line agents otherwise go hunting for in core files.

## Step 4: Render Through `TemplateBuildForm`

For theme-aware core UI, the normal rendering path is:

- build or compose the definition
- call `composeRegisteredBuildFormDefinition(...)` when the form is registered
- render `TemplateBuildForm`

Why this matters:

- `TemplateBuildForm` is the bridge to `ui.form`
- CTC can inject payload and theme-level rendering decisions
- the host renderer can still supply richer submit UX and confirm behavior

The `admin/users/create-user-form.tsx` example shows this clearly:

- it composes the registered definition
- it overrides submit labels
- it renders `TemplateBuildForm` with `area`, `route`, and `slot`

### Copyable Render Pattern

```tsx
const definition = composeRegisteredBuildFormDefinition(
  'admin-create-user-form',
  createAdminCreateUserBuildFormBase({
    copy,
    locale,
    userTemplateOptions
  }),
  {
    submit: {
      idleLabel: copy.create,
      pendingLabel: copy.creating,
      align: 'start'
    }
  }
);

return (
  <TemplateBuildForm
    definition={definition}
    area="admin"
    route="/admin/users"
    slot="admin.users.create"
  />
);
```

That is the shortest reliable path from registered form contract to theme-aware
admin rendering.

## Step 5: Build The List View

There are two table paths in the host:

- preferred semantic path:
  SDK BuildTable plus `DataTable`
- legacy/host path:
  direct host adapter usage or `ColumnDef[]`

For new work, prefer the BuildTable contract first.

The current host adapter in `components/ui/data-table.tsx` can still bridge both
worlds, but the long-term reusable contract is the SDK table definition.

Typical BuildTable ingredients:

- `defineBuildTable(...)`
- `buildTableColumn.*`
- `buildTableAction.*`
- remote query helpers when the dataset is not static

## Step 6: Let Theme And CTC Do Their Job

The CRUD screen is not complete until you account for template resolution.

The most relevant component IDs are:

- `ui.form`
- `ui.table`
- `ui.alert-dialog`
- `ui.async-submit-button`

This means:

- form rendering may be template-resolved
- table rendering may be template-resolved
- confirm dialogs and submit buttons may be theme or module overridden

Do not hardcode assumptions like "the admin form is always just
`components/ui/build-form.tsx`".

## Step 7: Plan Gating Belongs In The Server Layer

If the CRUD screen depends on subscription features or quotas:

- do not hide the UI only on the client
- enforce the rule in the controller or server action
- use the feature controller or SDK quota helpers depending on whether the code
  is host or module code

Host-side dashboard helpers:

- `getDashboardFeatureController(...)`
- `getDashboardScopedFeatureController()`

Module-side portable path:

- SDK plan feature helpers
- SDK quota helpers

## Suggested File Layout

For a core admin CRUD feature, the most natural layout is:

```txt
app/(dashboard)/admin/<feature>/page.tsx
app/(dashboard)/admin/<feature>/actions.ts
app/(dashboard)/admin/<feature>/forms.ts
app/(dashboard)/admin/<feature>/columns.tsx
app/(dashboard)/admin/<feature>/i18n.ts
```

Plus registry glue when using registered BuildForm flow:

```txt
lib/forms/registry-catalog.ts
lib/forms/registry.ts
```

## Good Default Recipe

If you are starting from zero, use this order:

1. define the form in `forms.ts`
2. implement the controller-wrapped action in `actions.ts`
3. register the form in `lib/forms/registry-catalog.ts`
4. map the submit action in `lib/forms/registry.ts`
5. render it through `TemplateBuildForm`
6. define the table contract
7. wire row actions and request actions
8. add feature/quota enforcement in the server path
9. confirm the page still respects CTC/theme behavior

## Common Mistakes

- building a new CRUD screen with plain JSX inputs before checking BuildForm
- wiring a raw mutation without an area controller
- skipping registry wiring and then wondering why preflight or request
  resolution feels inconsistent
- treating theme rendering as an afterthought
- enforcing plan rules only in the UI layer

## Related Docs

- `forms-and-validation.md`
- `datatables-and-remote-actions.md`
- `themes-and-ctc.md`
- `subscriptions-and-features.md`
