# @skitsaas/sdk

`@skitsaas/sdk` is the public contract for building modules that run inside SkitSaaS.

It provides:
- typed module manifest APIs
- server-side runtime helpers
- curated Drizzle exports
- datatable CRUD helpers
- structured form/modal builders
- structured form validation helpers
- source-package build and test utilities

## Installation

```bash
pnpm add @skitsaas/sdk
```

Peer dependencies:
- `react`
- `drizzle-orm`

## Quick Start

Create a module manifest and export it as default:

```ts
import { defineModule } from '@skitsaas/sdk';
import { createModuleApiRouter } from '@skitsaas/sdk/server';

export default defineModule({
  moduleId: 'mod.example.hello',
  version: '1.0.0',
  displayName: 'Hello Module',
  description: 'Minimal example module',

  adminRouteAliases: ['/admin/hello'],
  dashboardRouteAliases: ['/dashboard/hello'],
  frontendRouteAliases: ['/hello'],
  frontendRouteAccess: 'public',

  apiHandler: createModuleApiRouter({
    routes: [
      {
        method: 'GET',
        path: '/ping',
        auth: 'user',
        handler: async () => Response.json({ ok: true })
      }
    ]
  })
});
```

## Package Entrypoints

- `@skitsaas/sdk`
  - module manifest types/helpers (`defineModule`, `validateModuleManifest`)
  - event hooks and event types
  - module i18n and theme i18n types/helpers
  - theme config helper (`defineThemeConfig`)
  - datatable contracts/helpers
  - structured form contract/helpers (`defineBuildForm`, `buildFormField`, `withBuildFormValues`, `defineBuildModal`)
  - structured form validation helpers (`defineValidatedBuildForm`, `withBuildFormValidation`, `buildFormRule`, `validateBuildFormLocally`)
  - reusable validation helpers (`normalizeEmail`, `parseOptionalPositiveInt`, `buildFormValidationMessage`, `createBuildFormValidationResultFromFieldMessages`)
  - template utility helpers (`mergeClassNames`, value parsers)
- `@skitsaas/sdk/server`
  - auth/session helpers (`getUser`, `requireUser`, `requireAdmin`, `setSessionForUser`)
  - event emit helpers (`emitEvent`, `emitEventAsync`)
  - module config helpers (`getModuleConfigValue`, `setModuleConfigValue`)
  - db access bridge (`getDb`, `findTable`, `getTable`, `listTables`)
  - revalidation helpers (`revalidatePath`, `revalidatePaths`)
  - server action controller + form parsing helpers
  - structured build-form validation helpers (`validateBuildFormOnServer`, `validateBuildFormWithHandler`, `createValidatedServerActionController`)
  - JSON parsing helpers
  - declarative routers (`createModuleApiRouter`, `createModulePageRouter`)
- `@skitsaas/sdk/db`
  - curated Drizzle exports for PostgreSQL schema/query usage
- `@skitsaas/sdk/datatables`
  - datatable template contracts
  - CRUD API router helper (`createDataTableCrudApiRouter`)
- `@skitsaas/sdk/build`
  - source-package build helper (`buildSourcePackageModule`)
- `@skitsaas/sdk/testing`
  - source-package contract/test helper (`runSourcePackageTestSuite`)

## Server Helpers (Host Integration)

`@skitsaas/sdk/server` reads adapters configured by the host runtime (auth, db,
revalidation, events, config). Module authors only consume these APIs; host
projects wire them during bootstrap.

Example:

```ts
import { getDb, getTable, requireUser } from '@skitsaas/sdk/server';
import { eq } from '@skitsaas/sdk/db';

export async function listItems() {
  const user = await requireUser<{ id: number }>();
  const db = getDb<any>();
  const items = getTable<any>('items');
  return db.select().from(items).where(eq(items.userId, user.id));
}
```

## Datatable CRUD Router

Use `@skitsaas/sdk/datatables` to expose list/create/update/delete APIs with
auth, validation hooks, and optional revalidation.

```ts
import { createDataTableCrudApiRouter } from '@skitsaas/sdk/datatables';

export const apiHandler = createDataTableCrudApiRouter({
  basePath: '/items',
  policies: {
    list: { auth: 'user' },
    create: { auth: 'admin' },
    update: { auth: 'admin' },
    delete: { auth: 'admin' }
  },
  handlers: {
    list: async () => ({ items: [], total: 0 })
  }
});
```

## Structured Form Builder

```ts
import {
  buildFormField,
  defineBuildForm,
  withBuildFormValues
} from '@skitsaas/sdk';

const baseForm = defineBuildForm({
  request: { action: '/admin/items', method: 'post' },
  fields: [
    buildFormField.text({ name: 'title', label: 'Title', required: true }),
    buildFormField.select({
      name: 'status',
      label: 'Status',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'active', label: 'Active' }
      ]
    })
  ]
});

const editForm = withBuildFormValues(baseForm, {
  title: 'Launch checklist',
  status: 'active'
});
```

Use the SDK to describe fields, layout, submit target, confirm flows, and prefills.
The host app resolves rendering and theming through `TemplateBuildForm` + CTC.

If you need to attach request metadata, submit UI, and prefills in one step, use `composeBuildFormDefinition(...)` instead of chaining helpers manually.

Validation can be attached to the same form object:

```ts
import {
  buildFormField,
  buildFormRule,
  defineBuildForm,
  withBuildFormValidation
} from '@skitsaas/sdk';

const validatedForm = withBuildFormValidation(
  defineBuildForm({
    fields: [
      buildFormField.email({ name: 'email', label: 'Email', required: true })
    ]
  }),
  {
    client: { validateOn: ['blur'] },
    fields: {
      email: [buildFormRule.required(), buildFormRule.email()]
    }
  }
);
```

The current renderer treats `client.validateOn` as the eager-validation policy and still performs a final local validation pass on submit when local rules are present.

For the common CRUD case, `buildFormValidationPreset.blur(...)` centralizes the default validation shape used by most forms and can optionally enable preflight with the standard debounce.

On the server, validated actions can be wrapped with `createValidatedServerActionController(...)` so the same BuildForm definition is validated before mutation logic runs. Those validated actions are also compatible with `useActionState(...)`, and `BuildForm` now hydrates returned `fieldErrors` / `formError` automatically when the attached request action uses that validated path.

For DB-aware rules, the host can wire `configureBuildFormDbValidation(...)` from `@skitsaas/sdk/server`. That keeps `dbRef(...)` tokens serializable in the form definition while letting the host resolve `unique` / `exists` lookups server-side and through preflight routes. Edit flows can then reuse the same rule graph with `fieldRef(...)`, for example `buildFormRule.unique(dbRef('core.users.email'), { ignore: fieldRef('userId') })`. The adapter request also includes `runtime`, `formId`, and `fieldName`, which is useful for host-side logging and resolver diagnostics.

If host routes need custom business errors, prefer returning message descriptors instead of hardcoded strings. The SDK now exposes generic helpers like `buildFormValidationMessage.*(...)`, `normalizeEmail(...)`, and `parseOptionalPositiveInt(...)`; the host can then map descriptor keys to localized copy before returning `fieldErrors`.

## Build Helper for Source-Package Modules

```ts
import { buildSourcePackageModule } from '@skitsaas/sdk/build';

buildSourcePackageModule({
  moduleId: 'mod.example.hello'
});
```

This transpiles `src/` to `dist/`, copies supported assets, rewrites relative
imports when needed, and verifies the compiled manifest output.

## Testing Helper for Source-Package Modules

```ts
import { runSourcePackageTestSuite } from '@skitsaas/sdk/testing';

await runSourcePackageTestSuite({
  moduleId: 'mod.example.hello'
});
```

This validates the compiled manifest contract and can run additional custom
checks.

## Versioning and Compatibility

- The SDK follows semantic versioning.
- Breaking changes are published in major versions.
- Modules should declare a compatible `sdkRange` in `module.json`.
