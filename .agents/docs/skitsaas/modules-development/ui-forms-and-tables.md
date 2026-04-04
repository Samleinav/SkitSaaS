---
title: "Module UI, Forms, And Tables"
sidebar_position: 0
---

# Module UI, Forms, And Tables

This page focuses on the UI primitives module authors should reach for first.

## Default Rule

For new module UI, prefer SDK contracts first:

- BuildForm
- TemplateBuildForm
- BuildTable
- DataTable

That keeps the module portable and lets the host bridge in richer runtime
rendering where available.

## Forms

Preferred form path:

- define the form with SDK helpers
- validate with SDK form validation
- use SDK server action helpers in module code
- render with `TemplateBuildForm` when template-aware behavior matters

Use:

- `defineBuildForm(...)`
- `buildFormField.*`
- `withBuildFormValidation(...)`
- `TemplateBuildForm`
- `createValidatedServerActionController(...)`

## Important Boundary

In module code:

- do not use host-only `adminAction`
- do not use host-only `dashboardAction`

Use SDK server helpers instead.

## Tables

Preferred table path:

- define the table semantics with SDK BuildTable
- render with SDK `DataTable`
- let the host bridge improve the renderer automatically inside SkitSaaS

Use:

- `defineBuildTable(...)`
- `buildTableColumn.*`
- `buildTableAction.*`
- `DataTable`

## Why This Matters

If a module defaults to host-only forms or legacy table contracts, it becomes
harder to keep portable and harder to document as a clean SDK-first example.

## CTC And Template Pack

Modules can also contribute UI templates through `templatePack`.

This is where modules can influence:

- `ui.form`
- `ui.table`
- `ui.async-submit-button`

Declare template metadata in the manifest and keep the component IDs aligned
with the host CTC contract.

## Canonical Examples

- `modules/mod.example.package`
  SDK forms, SDK tables, and template pack in one module
- `modules/mod.example.portal`
  SDK form and table usage inside a portal context

## Common Mistakes

- using host UI imports in a portable module
- rebuilding CRUD forms by hand before checking BuildForm
- using legacy table patterns by default when BuildTable already fits
