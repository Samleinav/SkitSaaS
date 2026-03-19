---
title: SDK Overview
sidebar_position: 0
description: Public SDK surface for module contracts, server adapters, build helpers, and testing utilities.
---

# SDK Overview

This SDK provides a **stable public contract** for shared module surfaces. In
this repository, `source-host` is still a common authoring mode, but shared
contracts should remain SDK-first. For BuildForm specifically, SDK-only module
code can now reach full host UX inside SkitSaaS through the runtime adapter and
template resolver, without importing host internals.

## Packages

### `@skitsaas/sdk`

Public contract types plus lightweight runtime-safe helpers.

Exports:

- `defineModule`
- `ModuleManifest`
- `ModuleManifest.additionalLocales` (extend supported locales without adding a core typed locale bundle)
- `ModuleManifest.languagePack` (`scopes` declare explicit translation-provider intent for a module)
- `ModuleLanguagePack`
- `ModuleLanguagePackScope`
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
- `useI18n`, `createTranslator`, `FlatTranslationsByLocale`, and `FlatTranslationsByModuleId` (flat natural-key i18n helpers)
- `defineThemeConfig` / `ThemeConfig.additionalLocales` for theme-side locale registration
- persisted notification hook/helpers (`useNotifications`, `resolveSdkNotificationAreaFromPath`)
- structured form helpers (`defineBuildForm`, `buildFormField`, `withBuildFormValues`, `defineBuildModal`)
- structured form validation helpers (`defineValidatedBuildForm`, `withBuildFormValidation`, `buildFormRule`, `validateBuildFormLocally`)
- reusable validation helpers (`normalizeEmail`, `parseOptionalPositiveInt`, `buildFormValidationMessage`, `createBuildFormValidationResultFromFieldMessages`)
- portable form renderer (`BuildForm`, `SdkBuildFormProps`) — client component, usable in modules and portal pages without host imports
- portable form host bridge (`BuildFormUiAdapterProvider`) — lets the host delegate SDK `BuildForm` rendering without module-side `@/` imports
- server form wrapper (`TemplateBuildForm`, `SdkTemplateBuildFormProps`) — resolves host `ui.form` payloads when the host adapter is configured
- typed route factories (`RouteAdmin`, `RouteDashboard`, `RouteFrontend`, `RouteApi`, `RouteBuilder`, `configureRouteBuilderProxies`)
- named route registry (`route`, `registerRoute`, `getRegisteredRoute`, `RouteNotFoundError`)
- proxy area configuration (`configureAreaDefaults`, `matchRouteProxyChain`, `resolveAreaFallbackChain`)
- typed API route builders (`ApiRouteBuilder`, `ApiMethodRouteBuilder`, `ApiRouteEntry`, `ApiHandlerFn`, `ApiRouteProxyFn`, `HttpMethod`, `ApiAuthLevel`)
- API route dispatch (`dispatchApiRoutes`, `matchApiPath`, `configureApiAuthProxies`)
- structured datatable helpers (`defineBuildTable`, `buildTableColumn`, `buildTableAction`, `buildTableFilter`, `withBuildTableData`, `parseBuildTableQueryState`, `resolveBuildTableView`)
- datatable portable renderer (`DataTable`)
- rate limiting (`withRateLimit`, `checkRateLimit`, `configureRateLimitBackend`, `resolveClientIp`)
- role checks (`enrichUser`, `RichUser`, `UserContext`, `RichUserMethods`) — client+server safe
- storage helpers from `@skitsaas/sdk/sfiles` (`sfiles`, `bindSfilesActor`) for SDK-first file workflows

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

`BuildForm` from `@skitsaas/sdk` is now the default module-facing renderer. The
SDK also exposes a host bridge path:

- `BuildFormUiAdapterProvider` lets the host delegate SDK `BuildForm` instances
  to a richer renderer at runtime
- `TemplateBuildForm` lets server-rendered module pages receive host `ui.form`
  payload metadata without importing host internals

That means a `source-package` or SDK-first `source-host` module can stay
SDK-only and still upgrade to host submit/modal/CTC behavior when it runs
inside SkitSaaS. Outside the host, the SDK renderer remains self-contained.

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
- `configureI18n`
- `getServerTranslator`
- `getActionTranslator`
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
- `getCurrentSfilesActor`
- `getCurrentSfiles`
- `configureSubscriptionFeatures`
- `getPlanFeatureValue`
- `getPlanFeatureNumber`
- `checkFeature`
- `getQuotaStatus`
- `consumeQuota`
- `QuotaExceededError`
- `configureUserRoles`
- `configureUserContext`
- `enrichUser` (also in `@skitsaas/sdk`)

Server i18n helpers let modules stay on SDK imports in server-rendered pages
and server actions:

```ts
import { getServerTranslator, getActionTranslator } from '@skitsaas/sdk/server';

const t = await getServerTranslator({ moduleId: 'mod.analytics' });
const actionT = await getActionTranslator({ moduleId: 'mod.analytics' });
```

Both resolve the active locale through the host bootstrap and use the same flat
translation runtime as `useI18n({ moduleId })`.

## Sfiles

For module-owned file workflows, use `@skitsaas/sdk/sfiles` for the public
manager and `@skitsaas/sdk/server` when you want the current request actor
resolved for you.

```ts
import { getCurrentSfiles } from '@skitsaas/sdk/server';

const sfiles = await getCurrentSfiles();

const artifact = await sfiles.upload(
  Buffer.from(JSON.stringify({ ok: true }), 'utf8'),
  'artifact.json',
  {
    folder: '/modules/mod.example.suite/artifacts/',
    visibility: 'private',
    metadata: {
      moduleId: 'mod.example.suite',
      purpose: 'artifact'
    }
  }
);

const loaded = await sfiles.read(artifact.id);
const downloadUrl = await sfiles.getUrl(artifact.id);
await sfiles.delete(artifact.id);
```

When the module already has a resolved actor, bind it directly:

```ts
import { bindSfilesActor, sfiles } from '@skitsaas/sdk/sfiles';

const actorSfiles = bindSfilesActor({ userId: user.id, isAdmin: false }, sfiles);
const result = await actorSfiles.read(fileId);
```

Rules:

- permission and ownership enforcement stays in the host manager
- modules should not import `@/lib/sfiles`, `@/lib/sfiles/api-actor`, or host adapters
- `read(...)` is the SDK path for raw binary access to private artifacts
- `getCurrentSfiles()` is the easiest server-side path when the module just
  wants “current request actor + manager”

## Subscription Feature Gates & Quota

Modules handle subscription features through two SDK paths.

### Read plan configuration

Use this when the module needs the configured plan value but is not reading or
mutating usage:

```ts
import { getPlanFeatureNumber, getPlanFeatureValue } from '@skitsaas/sdk/server';

const ctx = { teamId: user.teamId, userId: null };

const maxDailyRuns = await getPlanFeatureNumber(
  'mod.analytics.runs.daily.max',
  ctx,
  3
);

const modelTier = await getPlanFeatureValue(
  'mod.analytics.model.tier',
  ctx
);
```

### Enforce usage-tracked quota

Use this when the feature also tracks usage in `quota_usage`:

```ts
import { checkFeature, getQuotaStatus, consumeQuota, QuotaExceededError } from '@skitsaas/sdk/server';

const ctx = { teamId: user.teamId, userId: null };

// Check: is feature enabled and quota not exhausted?
const feature = await checkFeature('mod.analytics.reports.daily', ctx);
if (!feature.enabled) return forbidden();
if (feature.exhausted) return quotaExceeded();

// Read current quota standing
const status = await getQuotaStatus('mod.analytics.reports.daily', ctx);
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

The adapter (`lib/quota/service.ts`) reads
`subscription_template_features` + `subscription_assignments` and writes to
`quota_usage`.

Key policy:

- core-managed keys stay in `lib/features/catalog.ts`
- module-owned keys do not need a catalog entry to be read through SDK
- prefer module-prefixed names such as `mod.example.suite.items.max`

Rule of thumb:

- `getPlanFeatureNumber(...)` / `getPlanFeatureValue(...)` = read plan config
- `checkFeature(...)` / `getQuotaStatus(...)` / `consumeQuota(...)` = enforce usage-tracked quota

Public types also available from `@skitsaas/sdk`:
`SubscriptionFeatureValueType`, `PlanFeatureValueResult`, `QuotaContext`,
`FeatureCheckResult`, `QuotaStatus`, `ConsumeOptions`, `ConsumeResult`,
`QuotaExceededError`.

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
RouteApi('/modules/mod.school/reports').GET().auth('user').roles('owner', 'teacher')
```

Requires `configureApiAuthProxies({ roleCheck: (roles) => proxyApiRoles(roles) })` in `lib/routing/area-setup.ts` (already configured by default).

**Multi-role page and portal routing** — restrict a page route without host imports:

```ts
RouteDashboard('/reports').roles('owner', 'teacher')
RoutePortal('school')('reports').roles('teacher')
```

The host wires the actual middleware role guard through
`configureRouteBuilderProxies({ roleCheck })` in `lib/routing/area-setup.ts`.
This keeps module `routes.ts` files SDK-only while preserving host-side DB-backed
role checks.

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
- pg-core builders: `pgTable`, `serial`, `varchar`, `integer`, `timestamp`, `customType`

Approved advanced pattern:

- use `customType(...)` from `@skitsaas/sdk/db` for custom PostgreSQL types such
  as `vector`
- for host-table FKs (`users`, `teams`, `sfiles`), define a minimal local table
  stub in the module schema instead of importing `@/lib/db/schema`

Example:

```ts
import { customType, integer, pgTable, serial, text } from '@skitsaas/sdk/db';

const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value) {
    return `[${value.join(',')}]`;
  }
});

const users = pgTable('users', {
  id: integer('id').primaryKey()
});

const sfiles = pgTable('sfiles', {
  id: integer('id').primaryKey()
});

const embeddingDocs = pgTable('mod_embedding_docs', {
  id: serial('id').primaryKey(),
  ownerUserId: integer('owner_user_id').references(() => users.id),
  sourceFileId: integer('source_file_id').references(() => sfiles.id),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }).notNull()
});
```

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

`useI18n()` is the preferred runtime API for module UI, theme UI, and new
host-side flat copy. Modules can provide translations through two parallel
contracts:

- nested area messages for `messages.mod['mod.<moduleId>']`
- flat natural-key translations for `useI18n()` / `createTranslator(...)`

The nested tree remains available for typed host access, but it is no longer
the preferred direction for new module-facing UI.

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
- official themes and modules should prefer `useI18n()` over typed host trees
- `useI18n({ moduleId: 'mod.analytics' })` resolves that module bucket before
  the shared flat registry
- if `dist/i18n/translations` exists, the host reads `dist` for that module
- conflicting `locale + key` values fail `pnpm i18n:prepare`

Current runtime priority:

1. explicit `translationsByLocale`
2. active theme area override
3. active theme `global` override
4. module bucket
5. shared/core flat registry
6. default locale fallback
7. raw key

Published provider contract:

- `ModuleManifest.languagePack.scopes=['shared-flat', 'module-flat']` maps to
  runtime behavior that already exists today
- `host-global`, `host-admin`, `host-dashboard`, and `host-login` are
  published provider metadata for the future explicit host language-pack layer
- `additionalLocales` still only controls locale publication, not provider
  intent

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

const ADMIN_ROLES = new Set(['admin']);

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
  createModulePageRouter
} from '@skitsaas/sdk/server';
import { defineModule, RouteApi } from '@skitsaas/sdk';

const ApiRoutes = {
  health: RouteApi('/modules/mod.analytics/health').GET().name('mod.analytics.api.health'),
  create: RouteApi('/modules/mod.analytics/items')
    .POST()
    .auth('admin')
    .name('mod.analytics.api.items.create'),
};

export const dashboardPage = createModulePageRouter({
  routes: [
    { path: '/', handler: () => <div>Home</div> },
    { path: '/items/:itemId', auth: 'user', handler: ({ params }) => params.itemId }
  ]
});

export default defineModule({
  moduleId: 'mod.analytics',
  version: '1.0.0',
  displayName: 'Analytics',
  apiRoutes: [
    ApiRoutes.health.handler(() => Response.json({ ok: true })),
    ApiRoutes.create.handler(() => Response.json({ ok: true }, { status: 201 })),
  ],
  dashboardPage,
});
```

`RouteApi(...).METHOD()` is the metadata-first part of this pattern. Keep those
builders in `routes.ts`, then attach handlers in `manifest.ts` via `apiRoutes`.
That separation avoids importing backend handler code in places that only need
route metadata. By contrast, legacy `apiHandler` combines routing and handler
dispatch in one function.

And Drizzle through SDK:

```ts
import { and, eq, pgTable, serial, varchar } from '@skitsaas/sdk/db';
```

## Versioning

- SDK follows semver (`MAJOR.MINOR.PATCH`):
  - `MAJOR`: breaking SDK API/contract changes for modules.
  - `MINOR`: backwards-compatible feature additions.
  - `PATCH`: backwards-compatible fixes only.
- Modules should declare `sdkRange` in `module.json` (for example `^1.3.5`).
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
