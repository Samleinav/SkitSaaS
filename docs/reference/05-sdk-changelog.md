---
title: SDK Change Log
sidebar_position: 99
---

# SDK Change Log (`changelogsdk.md`)

Registro operativo de gaps y cambios aplicados al SDK antes de publicarlos.

Objetivo:
- no perder cambios de contrato SDK hechos para destrabar modulos
- facilitar documentacion/publicacion posterior
- mantener trazabilidad por sprint

## Regla de uso

Cada vez que aparezca un SDK-gap durante implementacion de modulos:
1. registrar el gap en este archivo
2. registrar el cambio aplicado (si se implementa)
3. marcar estado de publicacion (`pending_publish` o `published`)

## Formato de entrada

```md
## YYYY-MM-DD - <id corto>

- `status`: pending_publish | published
- `sprint`: sprint-x
- `module`: mod.algo
- `type`: gap | change
- `summary`: descripcion corta
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server | @skitsaas/sdk/db
- `files`: rutas clave tocadas
- `notes`: contexto/impacto
```

Nota:
- este archivo conserva tanto cambios publicados como notas historicas de implementacion
- algunos snippets viejos muestran patrones que ya no son la guia preferida
- para el contrato vigente, tomar como fuente de verdad `docs/sdk/00-overview.md` y `docs/modules/07-api-modules.md`

## 2026-03-25 - sdk-datatable-host-bridge

- `status`: published
- `sprint`: sprint-c
- `module`: core
- `type`: change
- `summary`: `@skitsaas/sdk` `DataTable` now supports a host UI bridge so SDK-first module tables automatically reuse the active host/theme renderer inside SkitSaaS.
- `sdk_surface`: `@skitsaas/sdk`
- `files`:
  - `app/sdk/src/ui/data-table.tsx`
  - `app/sdk/src/ui/data-table-contract.ts`
  - `app/sdk/src/ui/data-table-adapter.tsx`
  - `app/sdk/src/ui/index.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/package.json`
  - `components/ui/data-table.tsx`
  - `components/ui/sdk-data-table-provider.tsx`
  - `app/layout.tsx`
  - `tests/sdk/data-table-ui-bridge.test.tsx`
  - `tests/ui/data-table.test.tsx`
  - `docs/sdk/00-overview.md`
  - `docs/datatables/01-build-table-system.md`
  - `docs/datatables/02-sdk-datatables-crud.md`
  - `docs/themes/03-template-controller.md`
  - `app/sdk/README.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.15.0 -> v1.16.0 (MINOR).

    New SDK exports:

    - `DataTableUiAdapterProvider`
    - `resolveSdkDataTableDefinition(...)`

    Runtime behavior:

    - SDK `DataTable` remains portable by default
    - when the host registers `DataTableUiAdapterProvider`, the same SDK
      definition renders through the richer host datatable
    - host rendering now keeps `sdk-data-table__...` semantic classes so
      existing module CSS customizations continue working while themes apply
      `ui.table` and `ui.table.control`

    This closes the main datatable presentation gap for SDK-first modules in
    admin/dashboard areas: modules can keep importing `DataTable` from
    `@skitsaas/sdk` and still inherit the active theme table UI.

## 2026-03-23 - sdk-governance-read-surface
- `status`: published
- `sprint`: sprint-c
- `module`: core
- `type`: change
- `summary`: `@skitsaas/sdk/server` now exposes a read-only governance surface so modules can inspect system activity evidence without importing admin-only host query internals.
- `sdk_surface`: `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/package.json`
  - `app/sdk/README.md`
  - `lib/db/queries.admin.ts`
  - `lib/modules/sdk-server-bootstrap.ts`
  - `tests/sdk/server-adapters.test.ts`
  - `docs/sdk/00-overview.md`
  - `docs/modules/00-overview.md`
  - `docs/operations/admin-dashboard.md`
  - `docs/operations/system-activity-logs.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.14.0 -> v1.15.0 (MINOR).

    New host-bootstrapped SDK surface:

    - `configureGovernance(...)`
    - `listSystemActivityLogs({ limit, eventCategory, status, requestId, actorUserId, entityType, entityId, search })`

    Guardrails:

    - admin-only: `listSystemActivityLogs(...)` calls `requireAdmin()` first
    - read-only: no governance write/update/delete API is exposed through SDK
    - core-owned enforcement: event writes, auth/proxy decisions, and admin DB
      ownership remain in the host

    This closes the first safe governance-read gap for `source-package`
    modules: they can now build operational dashboards or evidence views
    without importing `@/lib/db/queries.admin`.

## 2026-03-20 - i18n-legacy-callers-retired

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: Active host runtime call sites no longer use `useAreaMessages()` or `getServerMessages()`, and the remaining helper exports are now explicitly marked as deprecated compatibility APIs.
- `sdk_surface`: host i18n runtime
- `files`:
  - `lib/i18n/client.ts`
  - `lib/i18n/server.ts`
  - `app/(dashboard)/admin/page.tsx`
  - `app/(dashboard)/admin/subscriptions/page.tsx`
  - `app/(dashboard)/dashboard/activity/page.tsx`
  - `app/(dashboard)/dashboard/subscriptions/page.tsx`
  - `app/(frontend)/pricing/page.tsx`
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx`
  - `docs/reference/04-i18n-runtime.md`
  - `docs/modules/12-i18n.md`
  - `docs/themes/01-theme-runtime.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    No SDK version bump.

    The host runtime now routes all active call sites through:

    - `useI18n({ area })`
    - `getServerTranslator({ area })`
    - `getAreaMessagesFromTranslator(area, translator)` only where a typed
      compatibility tree is still required

    `useAreaMessages()`, `getServerMessages()`, and
    `getServerLocaleAndMessages()` still exist, but only as explicitly marked
    compatibility helpers for old typed surfaces.

## 2026-03-23 - sdk-auth-provider-state-helpers

- `status`: published
- `sprint`: sprint-c
- `module`: core
- `type`: change
- `summary`: `@skitsaas/sdk/server` now exposes auth provider state helpers so modules can reuse the core handoff nonce as the shared OAuth/OIDC `state` contract without importing host internals.
- `sdk_surface`: `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/package.json`
  - `app/sdk/README.md`
  - `app/api/auth/providers/[providerId]/start/route.ts`
  - `lib/auth/provider-handoff.ts`
  - `tests/sdk/server-adapters.test.ts`
  - `tests/auth/auth-provider-handoff.test.ts`
  - `docs/sdk/00-overview.md`
  - `docs/security/02-auth-provider-spi.md`
  - `docs/proxies/02-security.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.13.0 -> v1.14.0 (MINOR).

    New helpers:

    - `getAuthProviderStartState(request)`
    - `getVerifiedAuthProviderCallbackState(request)`
    - `validateAuthProviderCallbackState(request, state)`

    The host `/api/auth/providers/[providerId]/start` bridge now prepares the
    handoff before module dispatch, injects the nonce into the module request,
    and still sets the browser-bound handoff cookie on the final response.

    Modules can now bind provider `state` to the same nonce that the core
    callback bridge verifies, which closes the main SDK portability gap around
    provider-side anti-CSRF / replay wiring.

## 2026-03-18 - i18n-resolver-contract-and-legacy-policy

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: The docs now lock the current flat i18n resolver contract, mark `useI18n()` as the preferred API for new host/theme/module code, and treat `useAreaMessages()` as a deprecated compatibility surface while migration continues.
- `sdk_surface`: `@skitsaas/sdk`, `@skitsaas/sdk/server`
- `files`:
  - `docs/reference/04-i18n-runtime.md`
  - `docs/modules/12-i18n.md`
  - `docs/themes/01-theme-runtime.md`
  - `docs/sdk/00-overview.md`
  - `plans/i18n-unified-runtime-language-packs.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    Docs-only change; no SDK version bump.

    The published contract now explicitly documents the runtime behavior already
    present in code:

    - `useI18n({ area, themeId, moduleId, translationsByLocale })`
    - winning order: explicit -> theme area -> theme global -> module bucket ->
      shared/core flat -> default locale -> raw key
    - no published `packId`, `namespace`, or formal host language-pack layer yet

    This closes the architecture-lock step for the current runtime without
    pretending that language packs are already implemented.

---

## 2026-03-18 - sdk-source-package-migration-checklist

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: SDK migration docs now treat `source-host` as a transitional convenience and document the full checklist to reach `source-package` portability, including before/after replacements for server i18n, storage, plan feature reads, and DB/schema cases.
- `sdk_surface`: `@skitsaas/sdk`, `@skitsaas/sdk/server`, `@skitsaas/sdk/db`, `@skitsaas/sdk/sfiles`
- `files`:
  - `docs/sdk/01-sdk-first-migration.md`
  - `docs/modules/00-overview.md`
  - `plans/full-sdk-adaptation-gap-pack.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    Docs-only change; no SDK version bump.

    The migration guidance now makes the architecture goal explicit:

    - `source-host` is an intermediate convenience mode
    - `source-package` portability is the long-term target

    It also adds a concrete audit-and-replace checklist so maintainers can
    migrate existing modules without re-discovering which surfaces already have
    SDK replacements and which cases are still genuine gaps.

## 2026-03-19 - i18n-build-metadata-discovery

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: `i18n:prepare` now consumes generated theme/module locale metadata first, instead of re-importing source configs and manifests whenever build metadata is already available.
- `sdk_surface`: `@skitsaas/sdk`, host build pipeline
- `files`:
  - `scripts/static-additional-locales.ts`
  - `scripts/themes-prepare.ts`
  - `scripts/modules-prepare.ts`
  - `scripts/i18n-prepare.ts`
  - `tests/theme/themes-prepare.test.ts`
  - `tests/modules/modules-prepare.test.ts`
  - `tests/i18n/i18n-prepare.test.ts`
  - `docs/reference/04-i18n-runtime.md`
  - `docs/modules/12-i18n.md`
  - `docs/themes/01-theme-runtime.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    Themes now publish normalized `additionalLocales` metadata in
    `lib/themes/external.generated.ts`.

    Modules now publish normalized `additionalLocales` metadata in the new
    `lib/modules/external-meta.generated.ts`, generated without importing the
    runtime registry.

    `i18n:prepare` prefers those build artifacts and only falls back to direct
    source discovery when the generated metadata does not exist yet. This keeps
    locale publication more deterministic and reduces accidental coupling
    between i18n discovery and module/theme source code.

## 2026-03-19 - module-language-pack-provider-contract

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: `ModuleManifest` now exposes an explicit `languagePack.scopes` contract so modules can declare provider intent separately from `additionalLocales`, and `modules:prepare` publishes that metadata without importing the runtime registry.
- `sdk_surface`: `@skitsaas/sdk`, host build pipeline
- `files`:
  - `app/sdk/src/modules/manifest.ts`
  - `app/sdk/package.json`
  - `lib/modules/manifest.ts`
  - `scripts/static-additional-locales.ts`
  - `scripts/modules-prepare.ts`
  - `tests/modules/module-runtime-config-manifest.test.ts`
  - `tests/modules/modules-prepare.test.ts`
  - `docs/modules/01-manifest-registry.md`
  - `docs/modules/12-i18n.md`
  - `docs/sdk/00-overview.md`
  - `docs/reference/04-i18n-runtime.md`
  - `docs/extensions/module-development-index.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.12.0 -> v1.13.0 (MINOR).

    The new public contract is intentionally small:

    - `shared-flat`
    - `module-flat`
    - `host-global`
    - `host-admin`
    - `host-dashboard`
    - `host-login`

    Today, only `shared-flat` and `module-flat` map to existing runtime lookup
    behavior. The `host-*` scopes are declarative provider metadata for the
    future explicit host language-pack layer.

    This keeps locale publication (`additionalLocales`) separate from provider
    intent (`languagePack`) and lets `modules:prepare` validate/publish the
    metadata without eagerly importing module runtime code.

## 2026-03-18 - sdk-db-customtype-and-host-fk-pattern

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: `@skitsaas/sdk/db` now re-exports `customType(...)`, and the docs define the sanctioned SDK-first pattern for pgvector-style columns plus host-table FK stubs without importing host schema files.
- `sdk_surface`: `@skitsaas/sdk/db`
- `files`:
  - `app/sdk/src/db.ts`
  - `app/sdk/package.json`
  - `tests/sdk/db-advanced-exports.test.ts`
  - `docs/sdk/00-overview.md`
  - `docs/modules/04-database-migrations.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.11.0 -> v1.12.0 (MINOR).

    Advanced module schemas can now stay on the public SDK path for two common
    portability gaps:

    - PostgreSQL custom types via `customType(...)`, including pgvector-style
      builders
    - host-table foreign keys by declaring minimal local stubs such as
      `pgTable('users', { id: integer('id').primaryKey() })`

    This keeps module schema code compatible with the long-term goal of moving
    from `source-host` toward `source-package` without reaching into
    `@/lib/db/schema` or importing `drizzle-orm/pg-core` directly for these
    common advanced cases.

## 2026-03-18 - sdk-sfiles-actor-bound-read

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: `@skitsaas/sdk/sfiles` now supports actor-bound manager wrappers and raw binary reads, while `@skitsaas/sdk/server` can resolve `getCurrentSfilesActor()` and `getCurrentSfiles()` without host storage imports.
- `sdk_surface`: `@skitsaas/sdk/sfiles`, `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/sfiles.ts`
  - `app/sdk/src/server.ts`
  - `app/sdk/package.json`
  - `lib/sfiles/index.ts`
  - `lib/sfiles/manager.ts`
  - `lib/sfiles/api-actor.ts`
  - `lib/modules/sdk-server-bootstrap.ts`
  - `tests/sdk/sfiles-server.test.ts`
  - `docs/sdk/00-overview.md`
  - `docs/sdk/01-sdk-first-migration.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.10.0 -> v1.11.0 (MINOR).

    New storage contract pieces:

    - `sfiles.read(actor, fileId)` -> `{ file, buffer }`
    - `bindSfilesActor(actor, sfiles?)`
    - `getCurrentSfilesActor()`
    - `getCurrentSfiles()`

    This closes the common source-host gap where a module needed host
    `SfilesManager` or `@/lib/sfiles/api-actor` just to upload/read/delete a
    private artifact. Permission enforcement still lives in the host manager,
    not in module code.

## 2026-03-18 - sdk-plan-feature-reads

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: `@skitsaas/sdk/server` now exposes `getPlanFeatureValue` and `getPlanFeatureNumber` so modules can read plan-derived feature values without joining billing tables or conflating them with usage-tracked quota reads.
- `sdk_surface`: `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/subscription-features.ts`
  - `app/sdk/src/server.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/package.json`
  - `lib/quota/service.ts`
  - `tests/sdk/subscription-features.test.ts`
  - `docs/subscriptions/features-and-quotas.md`
  - `docs/sdk/00-overview.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.9.0 -> v1.10.0 (MINOR).

    The subscription SDK now separates two concerns explicitly:

    - plan configuration reads:
      - `getPlanFeatureValue(featureKey, ctx)`
      - `getPlanFeatureNumber(featureKey, ctx, fallback?)`
    - usage-tracked quota:
      - `checkFeature(...)`
      - `getQuotaStatus(...)`
      - `consumeQuota(...)`

    Module-owned feature keys no longer need to be treated as if they must live
    in `lib/features/catalog.ts`. The catalog remains the host-managed registry
    for core keys and central validation, while module-prefixed keys can be
    stored/read through the SDK without direct joins to billing tables.

## 2026-03-18 - sdk-server-i18n-translator

- `status`: published
- `sprint`: sprint-b
- `module`: mod.example.suite
- `type`: change
- `summary`: `@skitsaas/sdk/server` now exposes `configureI18n`, `getServerTranslator`, and `getActionTranslator` so modules can resolve flat i18n in server pages and actions without importing host `@/lib/i18n/server`.
- `sdk_surface`: `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/package.json`
  - `lib/modules/sdk-server-bootstrap.ts`
  - `modules/mod.example.suite/src/pages/admin-pages.tsx`
  - `modules/mod.example.suite/src/pages/dashboard-pages.tsx`
  - `modules/mod.example.suite/module.json`
  - `tests/sdk/server-adapters.test.ts`
  - `docs/sdk/00-overview.md`
  - `docs/modules/12-i18n.md`
  - `docs/reference/04-i18n-runtime.md`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.8.0 -> v1.9.0 (MINOR).

    The host now bootstraps an i18n adapter into `@skitsaas/sdk/server`.
    Module pages and actions can call:

    - `getServerTranslator({ moduleId })`
    - `getActionTranslator({ moduleId })`

    This keeps server-side module i18n on the public SDK path and allows the
    translator to resolve the module-scoped flat registry before falling back
    to the shared runtime.

## 2026-03-17 - sdk-i18n-module-scoped-flat-runtime

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: Flat i18n now publishes a module-scoped registry so `useI18n({ moduleId })` can resolve module-local translations before the shared flat registry.
- `sdk_surface`: `@skitsaas/sdk`
- `files`:
  - `app/sdk/src/i18n/runtime.ts`
  - `app/sdk/src/i18n/theme.tsx`
  - `app/sdk/src/i18n/types.ts`
  - `app/sdk/src/index.ts`
  - `components/theme/theme-i18n-host.tsx`
  - `lib/i18n/runtime.ts`
  - `lib/i18n/client.ts`
  - `lib/i18n/server.ts`
  - `scripts/i18n-prepare.ts`
  - `docs/reference/04-i18n-runtime.md`
  - `docs/modules/12-i18n.md`
  - `docs/sdk/00-overview.md`
- `notes`: |
    The generated flat runtime now has two layers:
    - shared `locale -> key/value`
    - scoped `moduleId -> locale -> key/value`

    Resolution order for the flat translator is now:
    - base/shared flat registry
    - module-local flat registry when `moduleId` is provided
    - theme `global + area` overrides
    - explicit `translationsByLocale` overrides
    - default locale fallback
    - raw key

    `useAreaMessages(...)` remains intact as the legacy typed host tree.

## 2026-03-16 - sdk-i18n-additional-locales-registration

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: Themes and modules can now register `additionalLocales` so the generated `SUPPORTED_LOCALES` set is no longer gated only by `lib/i18n/locales/*`.
- `sdk_surface`: `@skitsaas/sdk`
- `files`:
  - `app/sdk/src/theme/config.ts`
  - `app/sdk/src/modules/manifest.ts`
  - `scripts/i18n-prepare.ts`
  - `lib/i18n/messages/index.ts`
  - `docs/reference/04-i18n-runtime.md`
  - `docs/modules/12-i18n.md`
  - `docs/themes/01-theme-runtime.md`
  - `docs/themes/02-theme-authoring-guide.md`
- `notes`: |
    SDK v1.7.1 -> v1.8.0 (MINOR).

    `SUPPORTED_LOCALES` now comes from:
    - core locale folders under `lib/i18n/locales/*`
    - theme `additionalLocales` declared in `config.ts`
    - module `additionalLocales` declared in `ModuleManifest`
    - module flat translation locale filenames

    If a supported locale does not have a typed core message tree,
    `useAreaMessages(...)` falls back to `en`, while flat translators still
    resolve any available theme/module overrides for that locale.

## 2026-03-13 - sdk-routing-builder-lazy-next-server-import

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: Route builder role guards no longer import `next/server` eagerly, so source-package contract tests can import compiled manifests in plain Node without resolving Next runtime helpers up front.
- `sdk_surface`: `@skitsaas/sdk`
- `files`:
  - `app/sdk/src/routing/builder.ts`
  - `app/sdk/package.json`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.7.0 -> v1.7.1 (PATCH).

    `RouteBuilder.roles(...)` still returns the same runtime guard behavior, but
    the SDK now defers the Next runtime import until the guard actually runs and
    uses the Node-resolvable `next/server.js` entry. This keeps source-package
    contract tests plain-Node-safe when they only need to import a compiled
    module manifest and inspect its exported shape.

## 2026-03-13 - sdk-page-route-roles-and-bootstrap-hardening

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: Page and portal routes now support SDK `.roles(...)` guards, while host routing bootstrap was hardened so modules no longer need to import `@/lib/routing/area-setup` in `routes.ts`.
- `sdk_surface`: `@skitsaas/sdk`
- `files`:
  - `app/sdk/src/routing/builder.ts`
  - `app/sdk/src/routing/index.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/src/routing/api-route.ts`
  - `app/sdk/src/routing/portal.ts`
  - `lib/routing/area-setup.ts`
  - `core/api-routes.ts`
  - `lib/modules/registry.ts`
  - `lib/portals/all-portals.ts`
  - `lib/routing/with-api-route.ts`
- `notes`: |
    SDK v1.6.0 -> v1.7.0 (MINOR).

    Goal: remove a routing/bootstrap leak that forced module `routes.ts` files
    to import host internals just to get auth/role middleware wired correctly.

    New behavior:
    - page and portal route builders support `.roles('teacher', 'owner')`
    - host wires the actual DB-backed middleware through
      `configureRouteBuilderProxies({ roleCheck })`
    - typed API routes now fail closed when `.roles(...)` is declared but the
      host forgot to configure the role guard
    - host bootstrap now runs from host entrypoints used by middleware, module
      registry, portal registry, and API dispatchers

## 2026-03-13 - sdk-build-form-runtime-bridge

- `status`: published
- `sprint`: sprint-b
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: BuildForm now supports a host runtime bridge for source-package parity. The SDK adds `BuildFormUiAdapterProvider` for client render delegation and `TemplateBuildForm` plus `configureBuildFormUiTemplateResolver(...)` for host `ui.form` payload resolution.
- `sdk_surface`: `@skitsaas/sdk`, `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/ui/build-form-contract.ts`
  - `app/sdk/src/ui/build-form-adapter.tsx`
  - `app/sdk/src/ui/build-form-template-resolver.ts`
  - `app/sdk/src/ui/template-build-form.tsx`
  - `app/sdk/src/ui/build-form.tsx`
  - `app/sdk/src/ui/index.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/src/server.ts`
  - `components/ui/sdk-build-form-provider.tsx`
  - `lib/modules/sdk-server-bootstrap.ts`
- `notes`: |
    SDK v1.5.0 -> v1.6.0 (MINOR).

    Goal: keep source-package modules fully SDK-only while still allowing host
    parity when loaded inside SkitSaaS.

    Runtime split:
    - client: `BuildFormUiAdapterProvider` lets the host render SDK `BuildForm`
      instances through the host renderer
    - server: `TemplateBuildForm` asks the host for `ui.form` template payload
      metadata via `configureBuildFormUiTemplateResolver(...)`

    Fallback remains mandatory: if no adapter/resolver is configured, SDK
    `BuildForm` continues using its own renderer.

## 2026-03-11 - sdk-richuser-multirole-routing

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: RichUser pattern + multi-role API routing. `enrichUser(user)` replaces all hardcoded role-string comparisons. `lib/runtime-config/roles.ts` deleted. `.roles('owner','teacher')` on API route builder.
- `sdk_surface`: `@skitsaas/sdk`, `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/user-roles.ts` (new)
  - `app/sdk/src/routing/api-route.ts` (roles?, roleCheck, .roles() builder)
  - `app/sdk/src/index.ts` (enrichUser + types)
  - `app/sdk/src/server.ts` (configureUserRoles, configureUserContext, enrichUser)
  - `lib/auth/current-user.ts` (new — getCurrentUser, requireCurrentUser)
  - `lib/auth/contexts.ts` (UserContext re-exported from SDK)
  - `lib/routing/proxies.ts` (proxyApiRoles factory, enrichUser replaces getAdminAreaRoles)
  - `lib/routing/area-setup.ts` (roleCheck injected)
  - `lib/modules/sdk-server-bootstrap.ts` (configureUserRoles + configureUserContext)
  - `lib/runtime-config/roles.ts` (deleted)
- `notes`: |
    SDK v1.4.0 → v1.5.0 (MINOR).

    owner ≠ admin: default adminAreaRoles=['admin'], dashboardAreaRoles=['member','owner'].
    owner is team-level; admin is system-level. Never overlap.

    enrichUser() available client-side from @skitsaas/sdk (adapter not configured = uses defaults).
    getContext() server-side only (throws if called before configureUserContext).

    Multi-role routing: .auth('user').roles('owner','teacher') → proxyApiRoles runs after auth proxy.
    Requires configureApiAuthProxies({ roleCheck }) — wired in area-setup.ts.

---

## 2026-03-10 - sdk-gap-subscription-quota-controller

- `status`: published
- `sprint`: sprint-a
- `module`: cross-module-policy
- `type`: gap
- `summary`: no existe adapter SDK para que módulos verifiquen features habilitadas, lean límites de quota del plan asignado, ni trackeen y consuman usage — todo sin importar host internals
- `sdk_surface`: @skitsaas/sdk/server
- `files`:
  - `docs/reference/05-sdk-changelog.md`
  - `.agents/skills/mod-routing-api-permissions/SKILL.md`
- `notes`: |
    El gap cubre tres necesidades distintas que hoy no tienen contrato SDK:

    1. **Feature check** — ¿está habilitada la feature X para este team/user en su plan?
       Hoy: `getDashboardFeatureController` (host-only, forbidden en módulos).

    2. **Quota limit read** — ¿cuál es el límite del plan? (ej: pro=100/day, free=5/day)
       Hoy: no existe surface SDK.

    3. **Usage tracking** — ¿cuánto ha consumido este team en el periodo actual?
       Reducir usage en tres momentos distintos:
       - **intent** (proxy/middleware): reduce al entrar, bloquea si ya excedió
       - **success-only** (handler): reduce solo si la operación tuvo éxito
       - **async** (post-process): reduce después de un evento completado

    Workaround actual: usar `getModuleConfigValue` para feature flags module-owned
    bajo namespace `module.<moduleId>.*`, pero no resuelve quotas de suscripción.

    Implementado en SDK v1.4.0. Ver sección "Plan de implementación" para diseño completo.

    Archivos creados/modificados:
    - `app/sdk/src/subscription-features.ts` — adapter interface + types + service locator + checkFeature/getQuotaStatus/consumeQuota
    - `app/sdk/src/server.ts` — re-exports configureSubscriptionFeatures, checkFeature, getQuotaStatus, consumeQuota, QuotaExceededError
    - `app/sdk/src/index.ts` — re-exports public types (QuotaContext, FeatureCheckResult, QuotaStatus, ConsumeOptions, ConsumeResult, QuotaExceededError)
    - `lib/db/migrations/0027_quota_usage.sql` — tabla quota_usage
    - `lib/db/schema.ts` — quotaUsage table + relations + type exports
    - `lib/quota/service.ts` — implementación host del adapter (queries subscription_template_features + subscription_assignments + quota_usage)
    - `lib/modules/sdk-server-bootstrap.ts` — registra configureSubscriptionFeatures(quotaAdapter)

---

## Plan de implementación: sdk-gap-subscription-quota-controller

Nota historica:
- esta seccion preserva el plan original del gap
- los ejemplos usan `createModuleApiRouter(...)` porque fueron escritos antes de que `apiRoutes` tipados fuera la ruta preferida
- para implementaciones nuevas, usar `RouteApi(...).METHOD()` en `routes.ts` para la metadata
  y `apiRoutes` en el manifiesto para adjuntar handlers, salvo que se este documentando un flujo legacy

### Adapter interface (host-side)

```ts
// app/sdk/src/subscription-features.ts

export interface SubscriptionFeaturesAdapter {
  /** ¿Está habilitada la feature y cuál es su límite? null = sin límite */
  getFeatureLimit(
    featureKey: string,
    ctx: QuotaContext
  ): Promise<{ enabled: boolean; limit: number | null }>;

  /** Uso actual del periodo en curso */
  getUsage(
    featureKey: string,
    ctx: QuotaContext
  ): Promise<{ used: number; resetAt?: Date }>;

  /** Incrementar contador de uso. Retorna el nuevo total. */
  incrementUsage(
    featureKey: string,
    ctx: QuotaContext,
    amount: number
  ): Promise<{ used: number }>;
}

export type QuotaContext = {
  teamId?: number;
  userId?: number;
};
```

### SDK surface (`@skitsaas/sdk/server`)

```ts
// Configurar (host bootstrap, una vez)
configureSubscriptionFeatures(adapter: SubscriptionFeaturesAdapter): void

// Consultar desde módulo
checkFeature(featureKey: string, ctx: QuotaContext): Promise<FeatureCheckResult>
getQuotaStatus(featureKey: string, ctx: QuotaContext): Promise<QuotaStatus>
consumeQuota(featureKey: string, ctx: QuotaContext, options?: ConsumeOptions): Promise<ConsumeResult>

// Tipos
type FeatureCheckResult = {
  enabled: boolean;
  limit: number | null;    // null = sin límite
  remaining: number | null;
}

type QuotaStatus = {
  enabled: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt?: Date;
}

type ConsumeOptions = {
  amount?: number;  // default 1
}

type ConsumeResult = {
  ok: boolean;          // false si exceeded
  used: number;
  remaining: number | null;
  exceeded: boolean;
}
```

### Ejemplos de uso

#### 1. API endpoint con límites distintos por plan (pro=100/day, free=5/day)

```ts
// modules/mod.analytics/src/api/report.ts
import { getQuotaStatus, consumeQuota, requireUser } from '@skitsaas/sdk/server';

export const apiHandler = createModuleApiRouter({
  routes: [{
    method: 'POST',
    path: '/generate-report',
    auth: 'user',
    handler: async ({ user }) => {
      const quota = await getQuotaStatus('reports_daily', { teamId: user.teamId });

      // Feature deshabilitada en el plan
      if (!quota.enabled) {
        return Response.json({ error: 'feature_not_available' }, { status: 403 });
      }

      // Quota agotada (pro=100, free=5 — el límite viene del plan asignado)
      if (quota.remaining === 0) {
        return Response.json({
          error: 'quota_exceeded',
          limit: quota.limit,
          resetAt: quota.resetAt
        }, { status: 429 });
      }

      // Procesar
      const report = await generateReport(user.teamId);

      // Consumir quota SOLO si tuvo éxito
      await consumeQuota('reports_daily', { teamId: user.teamId });

      return Response.json({ ok: true, report });
    }
  }]
});
```

#### 2. Proxy / middleware: intent-based (reduce al entrar, bloquea si ya excedió)

```ts
// Útil para operaciones costosas donde el intento mismo consume (ej: llamadas a AI, SMS)
import { consumeQuota } from '@skitsaas/sdk/server';

handler: async ({ user, body }) => {
  // Consumir antes de procesar — si falla el handler, la quota ya se gastó
  const result = await consumeQuota('ai_requests_monthly', { teamId: user.teamId });

  if (!result.ok) {
    return Response.json({
      error: 'monthly_quota_exceeded',
      remaining: 0,
      resetAt: result.resetAt   // cuándo se resetea
    }, { status: 429 });
  }

  // Proceder — el crédito ya fue descontado
  const response = await callAiProvider(body.prompt);
  return Response.json({ ok: true, response });
}
```

#### 3. Event handler: consume quota después de un evento completado

```ts
// Útil para flujos asíncronos donde el consumo ocurre post-proceso
eventHandlers: [{
  id: 'mod.commerce.trackOrderQuota',
  hook: 'checkout.after_create_order',
  priority: 20,
  run: async (payload, context) => {
    // Solo consume si el pedido fue creado exitosamente
    if (payload.status === 'confirmed') {
      await consumeQuota('orders_monthly', { teamId: payload.teamId });
    }
  }
}]
```

#### 4. UI: mostrar badge de quota restante en dashboard

```tsx
// modules/mod.analytics/src/components/quota-badge.tsx
'use client'
// El componente recibe quotaStatus como prop (cargado server-side en el page handler)
// No llama a getQuotaStatus client-side — eso es server-only

export function QuotaBadge({ used, limit, remaining }) {
  const pct = limit ? Math.round((used / limit) * 100) : 0;
  return (
    <div>
      <span>{used} / {limit ?? '∞'}</span>
      {pct > 80 && <span className="text-warning">Cerca del límite</span>}
    </div>
  );
}
```

### Host-side: tabla de uso sugerida

```sql
-- lib/db/migrations/XXXX_quota_usage.sql
CREATE TABLE quota_usage (
  id          SERIAL PRIMARY KEY,
  feature_key VARCHAR(128) NOT NULL,
  team_id     INTEGER REFERENCES teams(id),
  user_id     INTEGER REFERENCES users(id),
  period_key  VARCHAR(32) NOT NULL,  -- ej: '2026-03', '2026-03-10'
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (feature_key, team_id, user_id, period_key)
);
```

### Archivos a crear/modificar

```
app/sdk/src/subscription-features.ts   (nuevo — adapter interface + service locator)
app/sdk/src/server.ts                   (agregar configure + check + get + consume)
app/sdk/src/index.ts                    (re-export tipos públicos: QuotaContext, QuotaStatus, etc.)
lib/modules/sdk-server-bootstrap.ts    (configurar adapter con queries del host)
lib/db/migrations/XXXX_quota_usage.sql (nueva tabla)
lib/quota/service.ts                   (implementación del adapter en el host)
docs/modules/08-notifications.md       (cross-ref — notificaciones por quota warnings)
docs/reference/05-sdk-changelog.md     (este archivo)
```

---

## Published

## 2026-03-09 - sdk-build-form-repeater-field

- `status`: published
- `sprint`: sprint-11
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: se agrega tipo de campo `repeater` al FormBuilder para tablas de filas dinámicas con add/remove, sub-campos tipados y lógica de `disableWhen` por fila
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/src/index.ts`
  - `components/ui/build-form.tsx`
  - `lib/forms/runtime.ts`
  - `app/(dashboard)/admin/subscriptions/forms.ts`
- `notes`: `BuildFormRepeaterFieldDefinition` con `subFields`, `addLabel`, `removeLabel`, `minRows`, `emptyRow`; serialización `{name}[]` + `{subField}_{rowId}`; rollout en `/admin/subscriptions`

## 2026-03-09 - sdk-build-form-dynamic-options

- `status`: published
- `sprint`: sprint-11
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: soporte de opciones dinámicas (`optionsKey` / `dynamicOptions`) en campos `select` del FormBuilder
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
  - `components/ui/build-form.tsx`
  - `lib/forms/definition.ts`
- `notes`: `BuildFormSelectFieldDefinition.optionsKey`; `BuildFormDefinition.dynamicOptions`; `withBuildFormDynamicOptions(...)`

## 2026-03-10 - sdk-persisted-notifications

- `status`: published
- `sprint`: sprint-11
- `module`: cross-module-notifications
- `type`: change
- `summary`: sistema de notificaciones persistentes — targeting global/usuario/team, área privada, superficie SDK cliente y server
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/notifications/types.ts`
  - `app/sdk/src/ui/notifications.tsx`
  - `app/sdk/src/server.ts`
  - `lib/notifications/service.ts`
  - `app/api/notifications/`
  - `components/ui/notification-runtime.tsx`
- `notes`: `useNotifications()`, `notifyGlobal/User/Users/Team/TeamMembers/TeamOwner()`, area `auto|admin|dashboard|both`

## 2026-03-06 - sdk-build-form-db-preflight

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: reglas DB-aware (`unique` / `exists`), preflight AJAX por field, compatibilidad con `useActionState`
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/src/form-validation.ts`
  - `lib/forms/db-registry.ts`
  - `lib/forms/preflight.ts`
  - `app/api/forms/validate/route.ts`
- `notes`: `configureBuildFormDbValidation(...)`, `dbRef(...)`, `fieldRef(...)`; piloto en `/admin/users`

## 2026-03-07 - sdk-build-form-compose-presets

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: helpers para componer definiciones de forms y presets de validación CRUD
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
  - `app/sdk/src/form-validation.ts`
- `notes`: `composeBuildFormDefinition(...)`, `buildFormValidationPreset.blur(...)`; host añade `composeRegisteredBuildFormDefinition(...)`

## 2026-03-07 - sdk-build-form-validation-messages

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: helpers para mensajes de validación reutilizables y resolvers por locale
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/validation-messages.ts`
  - `app/sdk/src/form-validation.ts`
- `notes`: `normalizeEmail`, `parseOptionalPositiveInt`, `buildFormValidationMessage.*`, `createBuildFormValidationResultFromFieldMessages(...)`

## 2026-03-06 - sdk-build-form-validation-contract

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: primera capa de validación estructurada para BuildForm — runtime browser-safe y helpers server-side
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/src/server.ts`
- `notes`: reglas `required`, `email`, `minLength`, `confirmed`; `dbRef`/`fieldRef`; `unique`/`exists` declarados

## 2026-03-06 - sdk-build-form-vine-server-wrapper

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: validación server-side con VineJS y wrapper de server actions para BuildForm
- `sdk_surface`: @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/src/form-validation.ts`
- `notes`: `validateBuildFormOnServer(...)`, `createValidatedServerActionController(...)`; piloto en `mod.example.suite`

## 2026-03-06 - sdk-structured-form-builder

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: contrato estructurado de forms/modals — fields, prefills, request config, masks
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
- `notes`: `defineBuildForm`, `buildFormField.*`, `withBuildFormValues`, `defineBuildModal`

## 2026-03-06 - sdk-client-notify-bridge

- `status`: published
- `sprint`: sprint-6
- `module`: cross-module-polish
- `type`: change
- `summary`: superficie cliente de notify via `CustomEvent` hacia `NotifyProvider` del host — feedback/toasts sin imports directos
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/ui/notify.ts`
  - `components/ui/sdk-notify-bridge.tsx`
- `notes`: `notify.success|error|warning|info` desde `@skitsaas/sdk`

## 2026-03-05 - sdk-route-context-matched-alias

- `status`: published
- `sprint`: sprint-6
- `module`: mod.education.enrollment
- `type`: change
- `summary`: `ModuleRouteContext` expone `matchedAlias` para que un módulo distinga la alias amigable usada al entrar
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/modules/manifest.ts`
  - `lib/modules/runtime.ts`
  - `tests/modules/module-runtime.test.ts`
- `notes`: cierra gap donde `resolveModulePageByPath()` no entregaba la alias al handler

## 2026-03-05 - sdk-file-storage-adapter

- `status`: published
- `sprint`: sprint-5
- `module`: cross-module-files
- `type`: change
- `summary`: adapter de file storage completo en `@skitsaas/sdk/sfiles` — upload, list, get, getUrl, zip, permissions sin imports al host
- `sdk_surface`: @skitsaas/sdk/sfiles
- `files`:
  - `app/sdk/src/sfiles.ts`
  - `app/sdk/package.json` (entry `./sfiles`)
- `notes`: cierra `sdk-gap-module-file-export`; `ISfilesManager`, `SFilesAdapter`, service locator via `registerSfiles()`; módulos importan `{ sfiles } from '@skitsaas/sdk/sfiles'`

## 2026-03-05 - sdk-datatable-ui-export

- `status`: published
- `sprint`: sprint-5
- `module`: mod.education.attendance
- `type`: change
- `summary`: `DataTable` React exportado al SDK para que módulos rendericen tablas sin importar componentes del host
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/ui/data-table.tsx`
- `notes`: cierra gap de UI tables para módulos source-host

## 2026-03-05 - sdk-standalone-contract-consumption

- `status`: published
- `sprint`: sprint-3
- `module`: mod.education.guardians
- `type`: change
- `summary`: SDK resuelve desde `file:app/sdk` — módulos consumen contratos standalone sin acoplarse al host
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `package.json`
  - `app/sdk/src/modules/manifest.ts`
  - `app/sdk/src/index.ts`
- `notes`: `ModuleUserRole`, `userRoles`, `standaloneHomeComponent`, `standaloneNavItems`

## 2026-03-05 - sdk-gap-log-policy

- `status`: published
- `sprint`: sprint-3
- `module`: cross-module-policy
- `type`: change
- `summary`: política establecida: todo SDK-gap/cambio se registra en `docs/reference/05-sdk-changelog.md`
- `sdk_surface`: process
- `files`:
  - `docs/reference/05-sdk-changelog.md`
  - `.agents/skills/module-boundary-guard/SKILL.md`
- `notes`: obligatorio para futuras iteraciones de sprints modulares
