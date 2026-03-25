# @skitsaas/sdk

`@skitsaas/sdk` is the public contract for building modules that run inside SkitSaaS.

It provides:
- typed module manifest APIs
- server-side runtime helpers
- curated Drizzle exports
- datatable CRUD helpers
- flat i18n translator helpers for modules and themes
- structured form/modal builders
- structured form validation helpers
- source-package build and test utilities

## Installation

```bash
pnpm add @skitsaas/sdk
```

Peer dependencies:
- `react`
- `react-dom`
- `drizzle-orm`
- `@tanstack/react-table`

## Quick Start

Create a module manifest and export it as default:

```ts
import { defineModule, RouteApi } from '@skitsaas/sdk';

const HelloApiRoutes = {
  ping: RouteApi('/modules/mod.example.hello/ping')
    .GET()
    .auth('user')
    .name('mod.example.hello.api.ping')
};

export default defineModule({
  moduleId: 'mod.example.hello',
  version: '1.0.0',
  displayName: 'Hello Module',
  description: 'Minimal example module',

  adminRouteAliases: ['/admin/hello'],
  dashboardRouteAliases: ['/dashboard/hello'],
  frontendRouteAliases: ['/hello'],
  frontendRouteAccess: 'public',

  apiRoutes: [
    HelloApiRoutes.ping.handler(async () => Response.json({ ok: true }))
  ]
});
```

## Package Entrypoints

- `@skitsaas/sdk`
  - module manifest types/helpers (`defineModule`, `validateModuleManifest`)
  - event hooks and event types
  - flat i18n types/helpers (`createTranslator`, `I18nProvider`, `useI18n`)
  - persisted notification hook/helpers (`useNotifications`, `resolveSdkNotificationAreaFromPath`)
  - theme config helper (`defineThemeConfig`)
  - datatable contracts/helpers + host bridge (`DataTableUiAdapterProvider`)
  - structured form contract/helpers (`defineBuildForm`, `buildFormField`, `withBuildFormValues`, `defineBuildModal`)
  - structured form validation helpers (`defineValidatedBuildForm`, `withBuildFormValidation`, `buildFormRule`, `validateBuildFormLocally`)
  - reusable validation helpers (`normalizeEmail`, `parseOptionalPositiveInt`, `buildFormValidationMessage`, `createBuildFormValidationResultFromFieldMessages`)
  - template utility helpers (`mergeClassNames`, value parsers)
- `@skitsaas/sdk/server`
  - auth/session helpers (`getUser`, `requireUser`, `requireAdmin`, `setSessionForUser`)
  - auth provider handoff/state helpers (`getAuthProviderStartState`, `getVerifiedAuthProviderCallbackState`, `validateAuthProviderCallbackState`)
  - governance read helpers (`listSystemActivityLogs`)
  - event emit helpers (`emitEvent`, `emitEventAsync`)
  - persisted notification helpers (`createNotification`, `notifyGlobal`, `notifyUser`, `notifyUsers`, `notifyTeam`, `notifyTeamMembers`, `notifyTeamOwner`)
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

## I18n

Use the flat translator across host-integrated modules and theme components.

Module or utility code:

```ts
import { createTranslator } from '@skitsaas/sdk';

const t = createTranslator('es', {
  es: {
    Cancel: 'Cancelar'
  }
});
```

Theme React components:

```tsx
import { useI18n } from '@skitsaas/sdk';

export function ThemeActionLabel({ themeId }: { themeId?: string }) {
  const t = useI18n({ themeId, area: 'admin' });
  return <span>{t('Cancel')}</span>;
}
```

## Server Helpers (Host Integration)

`@skitsaas/sdk/server` reads adapters configured by the host runtime (auth, db,
revalidation, events, config, notifications). Module authors only consume these APIs; host
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

Auth provider modules can also reuse the core handoff nonce as OAuth/OIDC
`state` without importing host internals:

```ts
import {
  getAuthProviderStartState,
  validateAuthProviderCallbackState
} from '@skitsaas/sdk/server';

export async function start(request: Request) {
  const state = getAuthProviderStartState(request);
  const redirectUrl = new URL('https://accounts.example.com/authorize');
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return Response.redirect(redirectUrl);
}

export async function callback(request: Request) {
  const url = new URL(request.url);
  const stateCheck = validateAuthProviderCallbackState(
    request,
    url.searchParams.get('state')
  );

  if (!stateCheck.ok) {
    return Response.json({ error: 'invalid_state' }, { status: 409 });
  }

  return Response.json({ ok: true });
}
```

Governance reads stay read-only and admin-scoped through the host adapter:

```ts
import { listSystemActivityLogs } from '@skitsaas/sdk/server';

const recentAuthEvents = await listSystemActivityLogs({
  eventCategory: 'auth',
  limit: 50,
  requestId: 'req-123'
});
```

## Persisted Notifications

Client components can read the current private notification feed with the SDK hook:

```tsx
import { useNotifications } from '@skitsaas/sdk';

export function ModuleNotificationBadge() {
  const { unreadItems } = useNotifications();

  return <span>{unreadItems.length}</span>;
}
```

Server code can target all users, direct users, or teams through the host adapter:

```ts
import { notifyGlobal, notifyTeamOwner, notifyUsers } from '@skitsaas/sdk/server';

await notifyGlobal({
  title: 'Maintenance',
  message: 'The platform will restart in 10 minutes.',
  tone: 'warning'
});

await notifyUsers([12, 48], {
  message: 'Your report export is ready.',
  area: 'dashboard',
  source: 'mod.analytics.reports'
});

await notifyTeamOwner(7, {
  message: 'Your team subscription requires confirmation.',
  area: 'dashboard'
});
```

Notes:

- `createNotification()` accepts `audience.type = 'global' | 'users' | 'team'`.
- `notifyTeam()`, `notifyTeamMembers()`, and `notifyTeamOwner()` resolve active team recipients in the host runtime before persistence.
- Backoffice themes can expose the persisted feed from `ui.user-menu` with `useNotifications({ area, includeRead: true })`.

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

## Structured BuildTable

```ts
import {
  DataTable,
  buildTableAction,
  buildTableColumn,
  buildTableFilter,
  defineBuildTable
} from '@skitsaas/sdk';

const table = defineBuildTable({
  data: [
    { id: 1, name: 'Ada Lovelace', status: 'active' }
  ],
  columns: [
    buildTableColumn.text({ key: 'name', header: 'Name' }),
    buildTableColumn.text({ key: 'status', header: 'Status' })
  ],
  header: {
    title: 'Users',
    description: 'Example SDK-first datatable definition.',
    actions: [
      buildTableAction.link({
        label: 'Create user',
        href: '/admin/users/create'
      }),
      buildTableAction.button({
        label: 'Export',
        type: 'button'
      }),
      buildTableAction.request({
        label: 'Sync',
        request: {
          url: '/api/users/sync',
          method: 'POST',
          successMessage: 'Users synchronized.'
        },
        confirm: {
          title: 'Sync users now?',
          confirmLabel: 'Sync',
          cancelLabel: 'Cancel'
        }
      })
    ]
  },
  toolbar: {
    search: {
      enabled: true,
      placeholder: 'Search users'
    },
    filters: [
      buildTableFilter.select({
        id: 'status',
        label: 'Status',
        column: 'status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'draft', label: 'Draft' }
        ]
      })
    ]
  },
  pagination: {
    pageSize: 10,
    pageSizeOptions: [10, 25, 50]
  },
  source: {
    url: '/api/users',
    debounceMs: 250
  }
});

export function UsersTable() {
  return <DataTable definition={table} />;
}
```

This is the first structured datatable layer in the SDK. It already supports:

- typed table definitions
- reusable column helpers
- default link/button/request actions with optional confirm flows
- header actions, row actions, and custom header content
- toolbar content/actions
- search, filters, sorting, and pagination state
- remote list loading for query-driven tables (`source.url`)
- query parse/serialize helpers for URL-driven tables
- portable rendering without host imports

Inside SkitSaaS, the host can also register `DataTableUiAdapterProvider` so
that this same SDK `DataTable` renders through the richer host/theme table UI
without changing module imports.

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
`BuildForm` and `TemplateBuildForm` are now the default module-facing renderers.
When the module runs inside SkitSaaS, the host upgrades those same SDK imports through:

- `BuildFormUiAdapterProvider` for runtime render delegation
- `TemplateBuildForm` for host `ui.form` payload resolution

Outside the host, SDK forms still render through the standalone SDK path.

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
