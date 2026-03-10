---
name: mod-ui-forms-validation
description: Build forms, validation rules, and server action controllers inside a source-package module using FormBuilder SDK contracts. Use this skill when adding CRUD forms, settings forms, validation logic, or nav widgets (UI/rendering side) to a module.
---

# mod-ui-forms-validation

## Scope

FormBuilder definitions, validation rules, server action controllers, and nav widget UI composition inside module code. SDK-only — no host form utilities.

## Required References

- `docs/forms/01-form-build-system.md` — FormBuilder architecture, field types, validation layers, SDK contract
- `docs/modules/03-permissions-actions.md` — `createValidatedServerActionController` pattern
- `docs/modules/06-nav-widgets.md` — nav widget structure (UI/slot/rendering side; load `mod-routing-api-permissions` for API/permissions side)

## Boundary Rules

```
FORBIDDEN:
  @/lib/forms/*
  @/components/ui/build-form
  @/components/ui/template-build-form
  @/lib/forms/registry*
  adminAction, dashboardAction  (host controllers)

REQUIRED (form definition):
  defineBuildForm, buildFormField.*, withBuildFormValidation,
  buildFormRule.*, composeBuildFormDefinition → @skitsaas/sdk

REQUIRED (server action):
  createValidatedServerActionController,
  validateBuildFormOnServer → @skitsaas/sdk/server

REQUIRED (DB validation):
  dbRef(), fieldRef() → @skitsaas/sdk
  configureBuildFormDbValidation → @skitsaas/sdk/server (host-side adapter only)
```

If a form needs a DB uniqueness check on a host table not in `TABLE_REGISTRY`:
→ escalate to `core-sdk-evolution` to expand `configureBuildFormDbValidation`.

## Form Definition

```ts
// modules/mod.<id>/src/forms.ts
import {
  defineBuildForm,
  buildFormField,
  withBuildFormValidation,
  buildFormRule,
  composeBuildFormDefinition
} from '@skitsaas/sdk';

export const createItemForm = defineBuildForm({
  id: 'mod.<id>.create-item',
  title: 'Create Item',
  sections: [{
    fields: [
      buildFormField.text({ name: 'name', label: 'Name', colSpan: 6 }),
      buildFormField.select({
        name: 'status',
        label: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]
      }),
    ]
  }]
});

export const validatedCreateItemForm = withBuildFormValidation(createItemForm, {
  fields: {
    name: [buildFormRule.required(), buildFormRule.minLength(2)],
  }
});
```

## Server Action Controller

```ts
// modules/mod.<id>/src/actions.ts
'use server'
import { createValidatedServerActionController } from '@skitsaas/sdk/server';
import { validatedCreateItemForm } from './forms';

const controller = createValidatedServerActionController(validatedCreateItemForm);

export const createItemAction = controller.action(async ({ values }) => {
  const db = getAdminDb<any>();
  // insert into module-owned table
  return { ok: true };
});
```

## Composing a Form with Action + Values

```ts
// modules/mod.<id>/src/pages/admin-page.tsx
import { composeBuildFormDefinition } from '@skitsaas/sdk';
import { createItemAction } from '../actions';
import { validatedCreateItemForm } from '../forms';

const formDef = composeBuildFormDefinition(validatedCreateItemForm, {
  request: { action: createItemAction },
  values: { name: '', status: 'active' }
});
```

## Field Types

`hidden` | `text` | `email` | `password` | `tel` | `url` | `date` | `number` | `textarea` | `select` | `checkbox` | `repeater`

For `repeater` and `dynamicOptions` patterns, see `docs/forms/01-form-build-system.md`.

## Nav Widgets (UI Side)

Nav widgets that display forms or UI slots should be authored as module components. The widget's `widgetHandler` returns JSX that can include form definitions rendered via `BuildForm` from `@skitsaas/sdk` (portable renderer). Do not import `TemplateBuildForm` (host-only wrapper).

For the API calls and permissions side of a nav widget, load `mod-routing-api-permissions`.

## Verification

```bash
rg -n "@/lib/forms|@/components/ui/build-form|@/components/ui/template-build-form" modules/<moduleId>
# must return 0 matches
pnpm exec tsc --noEmit
```
