---
title: SDK Overview
sidebar_position: 0
description: Public SDK surface for module contracts, server adapters, build helpers, and testing utilities.
---

# SDK Overview

This SDK provides a **stable public contract** for shared module surfaces. In
this repository, `source-host` is the primary authoring mode. The SDK remains
important for shared contracts, but it does not yet replace every host UI/runtime
capability needed for full `source-package` parity, especially around BuildForm
host UX.

## Packages

### `@skitsaas/sdk`

Public contract types plus lightweight runtime-safe helpers.

Exports:

- `defineModule`
- `ModuleManifest`
- `ModuleRouteContext`
- `ModulePageHandler`
- `ModuleApiHandler`
- `ModuleNavItem`
- `ModuleWidgetDefinition`
- `ModuleEventHandler`
- `ModuleEventContext`
- `EventPayload`
- `EventEmitContext`
- `EventHook`
- `EVENT_HOOKS`
- `ModuleMessagesByArea` (module i18n bundles)
- `createTranslator` and `FlatTranslationsByLocale` (flat natural-key i18n helper)
- persisted notification hook/helpers (`useNotifications`, `resolveSdkNotificationAreaFromPath`)
- structured form helpers (`defineBuildForm`, `buildFormField`, `withBuildFormValues`, `defineBuildModal`)
- structured form validation helpers (`defineValidatedBuildForm`, `withBuildFormValidation`, `buildFormRule`, `validateBuildFormLocally`)
- reusable validation helpers (`normalizeEmail`, `parseOptionalPositiveInt`, `buildFormValidationMessage`, `createBuildFormValidationResultFromFieldMessages`)
- portable form renderer (`BuildForm`, `SdkBuildFormProps`) — client component, usable in modules and portal pages without host imports
- portable form host bridge (`BuildFormUiAdapterProvider`) — lets the host delegate SDK `BuildForm` rendering without module-side `@/` imports
- server form wrapper (`TemplateBuildForm`, `SdkTemplateBuildFormProps`) — resolves host `ui.form` payloads when the host adapter is configured
- typed route factories (`RouteAdmin`, `RouteDashboard`, `RouteFrontend`, `RouteApi`, `RouteBuilder`)
- named route registry (`route`, `registerRoute`, `getRegisteredRoute`, `RouteNotFoundError`)
- proxy area configuration (`configureAreaDefaults`, `matchRouteProxyChain`, `resolveAreaFallbackChain`)
- typed API route builders (`ApiRouteBuilder`, `ApiMethodRouteBuilder`, `ApiRouteEntry`, `ApiHandlerFn`, `ApiRouteProxyFn`, `HttpMethod`, `ApiAuthLevel`)
- API route dispatch (`dispatchApiRoutes`, `matchApiPath`, `configureApiAuthProxies`)
- structured datatable helpers (`defineBuildTable`, `buildTableColumn`, `buildTableAction`, `buildTableFilter`, `withBuildTableData`, `parseBuildTableQueryState`, `resolveBuildTableView`)
- datatable portable renderer (`DataTable`)
- rate limiting (`withRateLimit`, `checkRateLimit`, `configureRateLimitBackend`, `resolveClientIp`)
- role checks (`enrichUser`, `RichUser`, `UserContext`, `RichUserMethods`) — client+server safe

Structured form contract:

- `BuildFormDefinition`
- `BuildFormSectionDefinition`
- `BuildFormFieldDefinition`
- `BuildModalDefinition`
- `buildFormField.*(...)`
- `composeBuildFormDefinition(...)`
- `withBuildFormValues(...)`
- `withBuildFormRequest(...)`
- `defineValidatedBuildForm(...)`
- `withBuildFormValidation(...)`
- `buildFormValidationPreset.blur(...)`
- `buildFormRule.*(...)`
- `validationCondition.*(...)`
- `dbRef(...)` and `fieldRef(...)`
- `validateBuildFormLocally(...)`
- `normalizeBuildFormValuesFromFormData(...)`
- `createBuildFormValidationResultFromFieldMessages(...)`
- `buildFormValidationMessage.*(...)`
- `normalizeEmail(...)`
- `parseOptionalPositiveInt(...)`
- `BuildForm` — portable `'use client'` renderer for modules and portal pages
- `SdkBuildFormProps` — props type for `BuildForm`
- `BuildFormUiAdapterProvider` — optional host bridge for runtime render delegation
- `TemplateBuildForm` — async server wrapper that resolves host `ui.form` payload metadata when available
- `SdkTemplateBuildFormProps` — props type for `TemplateBuildForm`

`composeBuildFormDefinition(...)` lets core or module code apply `request`, `submit`, and `values` in one pass instead of repeating `defineBuildForm(...) + withBuildFormRequest(...) + withBuildFormValues(...)` on every page. `buildFormValidationPreset.blur(...)` centralizes the common authoring preset used by most CRUD forms (`client.validateOn=['blur']`, plus optional preflight defaults).

`BuildForm` from `@skitsaas/sdk` is the portable fallback renderer. The SDK now
also exposes a host bridge path:

- `BuildFormUiAdapterProvider` lets the host delegate SDK `BuildForm` instances
  to a richer renderer at runtime
- `TemplateBuildForm` lets server-rendered module pages receive host `ui.form`
  payload metadata without importing host internals

That means a `source-package` module can stay SDK-only and still upgrade to host
submit/modal/CTC behavior when it runs inside SkitSaaS. Outside the host, the
SDK fallback renderer remains the default.

The datatable story is stronger today: keep `BuildTableDefinition` and helpers
in the SDK, and use SDK `DataTable` as the normal default. Source-host modules
can still render through `@/components/ui/data-table` when they want host theme
slots, notifications, and alert-dialog integration.

### `@skitsaas/sdk/server`

Optional server helpers.

Exports:

- `configureAuth`
- `getUser`
- `requireUser`
- `requireAdmin`
- `configureNotifications`
- `createNotification`
- `notifyGlobal`
- `notifyUser`
- `notifyUsers`
- `notifyTeam`
- `notifyTeamMembers`
- `notifyTeamOwner`
- `configureRevalidation`
- `revalidatePath`
- `revalidatePaths`
- `configureEventEmitter`
- `emitEvent`
- `emitEventAsync`
- `configureModuleConfig`
- `getModuleConfigValue`
- `setModuleConfigValue`
- `configureDatabase`
- `getDb`
- `getAdminDb`
- `findTable`
- `getTable`
- `listTables`
- `createModuleApiRouter`
- `createModulePageRouter`
- `createServerActionController`
- `createValidatedServerActionController`
- `configureBuildFormDbValidation`
- `configureBuildFormUiTemplateResolver`
- `createFormReader`
- `validateBuildFormOnServer`
- `validateBuildFormWithHandler`
- `validateBuildFormDbRules`
- `parseJsonBody`
- `isJsonRecord`
- `hasOwn`
- `configureSubscriptionFeatures`
- `checkFeature`
- `getQuotaStatus`
- `consumeQuota`
- `QuotaExceededError`
- `configureUserRoles`
- `configureUserContext`
- `enrichUser` (also in `@skitsaas/sdk`)

## Subscription Feature Gates & Quota

Modules check plan features and track usage exclusively through the SDK:

```ts
import { checkFeature, getQuotaStatus, consumeQuota, QuotaExceededError } from '@skitsaas/sdk/server';

const ctx = { teamId: user.teamId, userId: null };

// Check: is feature enabled and quota not exhausted?
const feature = await checkFeature('dashboard.team.reports.daily', ctx);
if (!feature.enabled) return forbidden();
if (feature.exhausted) return quotaExceeded();

// Read current quota standing
const status = await getQuotaStatus('dashboard.team.reports.daily', ctx);
// → { limit: 100, used: 47, remaining: 53, resetAt: Date }

// Consume quota — three patterns:
// a) intent-based: consume before the action (strict throws QuotaExceededError)
await consumeQuota('api_calls', ctx, { strict: true });

// b) success-only: consume after confirming success
const result = await doWork();
if (result.ok) await consumeQuota('exports', ctx);

// c) async / event handler
run: async (payload) => {
  await consumeQuota('proxy_requests', { teamId: payload.teamId, userId: null });
}
```

The adapter (`lib/quota/service.ts`) reads `subscription_template_features` + `subscription_assignments` and writes to `quota_usage`. Feature keys are defined in `lib/features/catalog.ts`.

Public types also available from `@skitsaas/sdk`: `QuotaContext`, `FeatureCheckResult`, `QuotaStatus`, `ConsumeOptions`, `ConsumeResult`, `QuotaExceededError`.

## RichUser — Role Checks & User Context

`enrichUser(user)` adds role-check methods to any object with `{ id: number; role: string }`. Available from both `@skitsaas/sdk` (client+server) and `@skitsaas/sdk/server` (with configure functions).

```ts
import { enrichUser } from '@skitsaas/sdk';

const u = enrichUser(user);
u.isAdmin()                    // role in adminAreaRoles (default: ['admin'])
u.isOwner()                    // role === 'owner' (team owner — NOT system admin)
u.isMember()                   // role in dashboardAreaRoles ∪ adminAreaRoles
u.hasRole('teacher')
u.hasAnyRole('owner', 'teacher')
u.canAccess('admin' | 'dashboard')
await u.getContext()           // → UserContext (server-side only, needs adapter)
```

**`UserContext`** (from `@skitsaas/sdk`):

```ts
type UserContext =
  | { type: 'system_admin' }
  | { type: 'team_member'; teamId: number; memberRole: string }
  | { type: 'standalone'; userId: number }
  | { type: 'public' };
```

**owner ≠ admin**: `isOwner()` = team owner (dashboard access). `isAdmin()` = system admin (`/admin` access). They are independent — never combine them.

Adapter wiring in `lib/modules/sdk-server-bootstrap.ts`:

```ts
configureUserRoles({
  adminAreaRoles:     appConfig.roles?.adminArea     ?? ['admin'],
  dashboardAreaRoles: appConfig.roles?.dashboardArea ?? ['member', 'owner'],
});
configureUserContext({
  resolve: (userId, role) => getUserContext({ id: userId, role } as User),
});
```

Host shortcut: `lib/auth/current-user.ts` → `getCurrentUser(): Promise<RichUser<User> | null>` and `requireCurrentUser()`.

**Multi-role API routing** — restrict an endpoint to specific roles:

```ts
RouteApi('/api/modules/mod.school/reports').GET().auth('user').roles('owner', 'teacher')
```

Requires `configureApiAuthProxies({ roleCheck: (roles) => proxyApiRoles(roles) })` in `lib/routing/area-setup.ts` (already configured by default).

## Persisted Notifications

The host now exposes a persisted private notification feed through the SDK.

- Client: `useNotifications()` polls `/api/notifications` for the current private area and exposes `items`, `unreadItems`, `refresh`, `markRead`, and `dismiss`.
- Server: `createNotification()`, `notifyGlobal()`, `notifyUser()`, `notifyUsers()`, `notifyTeam()`, `notifyTeamMembers()`, and `notifyTeamOwner()` call the host notification adapter configured during bootstrap.
- Audience contract: `createNotification()` accepts `audience.type = 'global' | 'users' | 'team'`.
- Team targeting: `notifyTeam()`, `notifyTeamMembers()`, and `notifyTeamOwner()` resolve current team memberships to direct recipients before persistence.
- Area targeting:
  - `area='auto'` resolves to `admin` for admin-like users
  - `area='auto'` resolves to `dashboard` for non-admin users
  - `area='both'` makes the notification visible in both private areas
- Theme integration: backoffice templates can surface the feed from `ui.user-menu` with `useNotifications({ area, includeRead: true })` while keeping the host-provided menu `children`.

### `@skitsaas/sdk/db`

Curated Drizzle exports via SDK entrypoint.

`createValidatedServerActionController(...)` is now compatible with both direct `<form action={...}>` usage and `useActionState(...)`, which lets host `BuildForm` instances hydrate server validation results without per-page glue.

`configureBuildFormDbValidation(...)` lets the host inject DB-aware validation lookups for `unique` / `exists` rules. Host code can then reuse the same BuildForm definition for preflight and final server validation without leaking DB objects into browser bundles. Edit flows can keep those checks race-safe by pairing `dbRef(...)` with `fieldRef(...)`, for example `buildFormRule.unique(dbRef('core.users.email'), { ignore: fieldRef('userId') })`. The adapter request now also includes `runtime`, `formId`, and `fieldName`, so host runtimes can log resolver misses or route DB validation through area-specific observability.

Examples:

- query helpers: `and`, `or`, `eq`, `desc`, `sql`
- pg-core builders: `pgTable`, `serial`, `varchar`, `integer`, `timestamp`

### `@skitsaas/sdk/build`

Node-only helper for `source-package` module build scripts.

Exports:

- `buildSourcePackageModule`

`buildSourcePackageModule({ moduleId })`:

- reads module `src/`
- transpiles `.ts/.tsx/.jsx` into `.js` under `dist/`
- copies static assets (`.js/.mjs/.cjs/.json/.css`)
- validates `dist/manifest.js`
- expects extensionless local imports in module source (for example `./data`)

### `@skitsaas/sdk/testing`

Node-only helpers for module-level tests.

Exports:

- `runSourcePackageContractChecks`
- `runSourcePackageTestSuite`

`runSourcePackageTestSuite(...)` runs SDK contract checks and then custom checks
provided by the module author.

## Module Modes

`module.json` now requires `moduleMode` to define how the host consumes the
module:

- `prebuilt`: module ships compiled `entry` (for example `dist/manifest.js`).
- `source-host`: module ships source and the host compiles it. This is the recommended default in this repo.
- `source-package`: module has its own `package.json`; `modules:build` compiles
  it first and host consumes only compiled `entry`. Treat this as an advanced secondary path until SDK parity is broader.

### source-host modules

Use when you want host-side compilation and full access to host components,
theme runtime, and other internal surfaces that the SDK does not yet fully
replace.

Structure:

- `modules/<moduleId>/src/manifest.ts`
- `modules/<moduleId>/module.json`

Recommended pattern:

- keep shared contracts (`defineModule`, routes, BuildForm definitions, BuildTable definitions, validation helpers) in the SDK
- import host components/utilities directly when exact core parity matters

### prebuilt modules

Use when you ship compiled runtime artifacts without source.

Structure:

- `modules/<moduleId>/dist/manifest.js`
- `modules/<moduleId>/module.json`

### source-package modules

Use when module source has an isolated dependency/build pipeline and you accept
lighter host parity in some UI/runtime areas.

Structure:

- `modules/<moduleId>/package.json`
- `modules/<moduleId>/src/*`
- `modules/<moduleId>/dist/manifest.js`
- `modules/<moduleId>/module.json`

Rules:

- `modules:build` runs `buildCommand` from `module.json`.
- if `testCommand` is declared, `modules:build` runs it after successful build.
- modules can use `@skitsaas/sdk/build` to keep `<module-root>/scripts/build.mjs` minimal.
- `modules:prepare` resolves only compiled `entry` for this mode.
- No fallback to `sourceEntry` is allowed for `source-package`.

## Module Metadata (`module.json`)

Example (`source-host`):

```json
{
  "moduleId": "mod.analytics",
  "version": "1.0.0",
  "moduleMode": "source-host",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^1.3.5",
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Mode contract:

1. `prebuilt`: requires `entry`.
2. `source-host`: requires `sourceEntry` (or default `src/manifest.*` candidates).
3. `source-package`: requires `entry`, `buildCommand`, and `sdkRange`.

`db` is optional. When present:

- `schemaVersion`: module-owned schema revision (integer >= 0)
- `migrationsDir`: module SQL migrations folder

## Custom Module Routes

Modules can expose friendly URLs via manifest aliases:

- `adminRouteAliases` (must be under `/admin/*`)
- `dashboardRouteAliases` (must be under `/dashboard/*`)

Rules:

- Aliases cannot collide with core routes (`/admin/users`, `/dashboard/security`, etc.).
- Aliases cannot overlap with another module alias.
- For navigation links, set `adminNavItems[].href` / `dashboardNavItems[].href` to the alias.

## Registry Automation

The host app uses a prebuild script to generate static imports:

```
pnpm modules:build
pnpm modules:prepare
```

This writes:

- `lib/modules/external.generated.ts`

The registry merges core + external modules automatically.

Module discovery uses:

1. `MODULES_DIR` env var (optional)
2. `/modules` (default)
3. `/examplemodules` (fallback for samples)

## Sync runtime state

After new modules are added, sync the DB table:

```
pnpm modules:sync
```

This creates missing rows in `app_modules` and keeps existing `enabled` rows
unchanged. New modules are enabled by default. To keep new modules installed
without enabling them:

```
MODULES_SYNC_ENABLE_NEW=false pnpm modules:sync
```

## Module DB migrations

Run module-owned migrations:

```
pnpm modules:migrate
```

Useful options:

- `pnpm modules:migrate --dry-run`
- `pnpm modules:migrate --module=mod.analytics`

## Module I18n

Modules can provide translations through two parallel contracts:

- nested area messages for `messages.mod['mod.<moduleId>']`
- flat natural-key translations for `createTranslator(...)`

Nested area JSON:

- `modules/<moduleId>/i18n/<area>/<locale>.json`
- `modules/<moduleId>/dist/i18n/<area>/<locale>.json`

Flat natural-key JSON:

- `modules/<moduleId>/i18n/translations/<locale>.json`
- `modules/<moduleId>/dist/i18n/translations/<locale>.json`

Example flat JSON:

```json
{
  "Create item": "Crear elemento",
  "Settings saved": "Configuracion guardada"
}
```

Rules:

- flat files must be a single-level object of `English key -> translated value`
- if `dist/i18n/translations` exists, the host reads `dist` for that module
- conflicting `locale + key` values fail `pnpm i18n:prepare`

Build commands:

```bash
pnpm modules:i18n
pnpm i18n:prepare
```

See `docs/modules/12-i18n.md` for the full contract.

## Server Helpers (Optional)

If a module needs auth/session, revalidation, events, or module config, the
host app should configure adapters once (server-only):

```ts
import {
  configureAuth,
  configureDatabase,
  configureEventEmitter,
  configureModuleConfig,
  configureRevalidation
} from '@skitsaas/sdk/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  deleteAppConfigEntry,
  upsertAppConfigEntry
} from '@/lib/config/app-config-writes';
import {
  getAppConfigValueFromDb,
  inferAppConfigIsSecret,
  trimToNull
} from '@/lib/config/app-config';
import { adminDb, db } from '@/lib/db/drizzle';
import {
  users,
  subscriptionAssignments,
  sysActivityLogs
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { emitEvent, emitEventAsync } from '@/lib/events/bus';

const ADMIN_ROLES = new Set(['owner', 'admin']);

async function requireDashboardUser() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  return user;
}

async function requireAdminDashboardUser() {
  const user = await requireDashboardUser();
  if (!ADMIN_ROLES.has(String(user.role ?? '').toLowerCase())) {
    redirect('/dashboard');
  }

  return user;
}

configureAuth({
  getUser,
  requireUser: requireDashboardUser,
  requireAdmin: requireAdminDashboardUser
});
configureRevalidation({ revalidatePath });

configureEventEmitter({ emitEvent, emitEventAsync });
configureModuleConfig({
  getConfigValue: getAppConfigValueFromDb,
  setConfigValue: async (namespace, configKey, configValue) => {
    const normalizedNamespace = namespace.trim();
    const normalizedConfigKey = configKey.trim();
    const normalizedValue = trimToNull(configValue);

    if (!normalizedValue) {
      await deleteAppConfigEntry({
        namespace: normalizedNamespace,
        configKey: normalizedConfigKey
      });
      return;
    }

    await upsertAppConfigEntry({
      namespace: normalizedNamespace,
      configKey: normalizedConfigKey,
      configValue: normalizedValue,
      isSecret: inferAppConfigIsSecret(normalizedConfigKey)
    });
  }
});
const TABLE_REGISTRY = new Map<string, unknown>([
  ['users', users],
  ['subscriptions', subscriptionAssignments],
  ['subscription_assignments', subscriptionAssignments],
  ['logs', sysActivityLogs],
  ['sys_activity_logs', sysActivityLogs]
]);
configureDatabase({
  getDb: () => db,           // saas_app role — RLS enforced (user-facing queries)
  getAdminDb: () => adminDb, // saas_admin role — bypasses RLS (admin / module-owned tables)
  getTable: (tableId) => {
    // tableId can be alias ("users", "subscriptions", "logs")
    // or db table name ("users", "subscription_assignments", etc.)
    return TABLE_REGISTRY.get(tableId) ?? null;
  },
  listTables: () => TABLE_REGISTRY.keys()
});
```

Then modules can use:

```ts
import {
  emitEventAsync,
  getAdminDb,
  getDb,
  getTable,
  requireUser,
  revalidatePaths
} from '@skitsaas/sdk/server';

const user = await requireUser<{ id: number }>();

// getAdminDb() — use for module-owned tables and admin-area queries.
// Module-owned tables are not in the saas_app grant list, so saas_app
// cannot access them. saas_admin bypasses RLS and has access to all tables.
// The module is responsible for its own authorization logic.
const db = getAdminDb<any>();

// getDb() — use only when the query targets host RLS-protected tables
// (users, team_members, etc.) and app.user_id is set in the request context
// via withUserContext(). Prefer getAdminDb() when in doubt.
const userScopedDb = getDb<any>();

const usersTable = getTable<any>('users');
await revalidatePaths(['/dashboard/custom/analytics']);

await emitEventAsync('email.smtp.sent', { module: 'mod.analytics' }, {
  source: 'mod.analytics',
  actorUserId: user.id
});
```

Declarative route registration for module API and module pages:

```ts
import {
  createModuleApiRouter,
  createModulePageRouter
} from '@skitsaas/sdk/server';

export const apiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: () => Response.json({ ok: true })
    },
    {
      method: 'POST',
      path: '/items',
      auth: 'user',
      roles: ['admin', 'owner'],
      handler: ({ user }) => Response.json({ ok: true, userId: user?.id })
    }
  ]
});

export const dashboardPage = createModulePageRouter({
  routes: [
    { path: '/', handler: () => <div>Home</div> },
    { path: '/items/:itemId', auth: 'user', handler: ({ params }) => params.itemId }
  ]
});
```

And Drizzle through SDK:

```ts
import { and, eq, pgTable, serial, varchar } from '@skitsaas/sdk/db';
```

## Versioning

- SDK follows semver (`MAJOR.MINOR.PATCH`):
  - `MAJOR`: breaking SDK API/contract changes for modules.
  - `MINOR`: backwards-compatible feature additions.
  - `PATCH`: backwards-compatible fixes only.
- Modules should declare `sdkRange` in `module.json` (for example `^0.1.0`).
- `source-package` modules should keep `react`, `react-dom`, `next`,
  `@skitsaas/sdk` aligned as peers.
- `pnpm modules:build` runs in strict compatibility mode by default and validates
  `source-package` peer dependencies (`react`, `react-dom`, `next`, `@skitsaas/sdk`).
- `pnpm modules:prepare` runs in strict compatibility mode and fails on:
  - missing `sdkRange`
  - invalid semver range
  - incompatible range vs host SDK version (`app/sdk/package.json`)
- To run in warning mode only:

```bash
npx tsx scripts/modules-prepare.ts --warn-compat
```

## Build Checklist

1. Drop module in `modules/<moduleId>`.
2. Ensure `module.json` exists.
3. Run `pnpm modules:build`.
4. Run `pnpm modules:prepare`.
5. Run `pnpm modules:i18n`.
6. Run `pnpm i18n:prepare`.
7. Build the app.

For step-by-step migration from legacy module imports to SDK-first patterns, see
`docs/sdk/01-sdk-first-migration.md`.
