---
title: Component Template Controller
sidebar_position: 14
---

# Component Template Controller

The Component Template Controller (CTC) centralizes template selection for UI components across:

- core defaults
- theme overrides
- module defaults/overrides

Current implementation files:

- `lib/templates/catalog.ts`
- `lib/templates/contract.ts`
- `lib/templates/controller.ts`
- `lib/templates/theme-pack.ts`
- `lib/templates/module-pack.ts`
- `lib/templates/runtime.ts`
- `lib/templates/ui-table.ts`
- `lib/templates/ui-table-payload.ts`
- `lib/templates/ui-form.ts`
- `lib/templates/ui-form-payload.ts`
- `lib/templates/ui-async-submit-button.ts`
- `lib/templates/ui-async-submit-button-payload.ts`
- `lib/templates/ui-alert-dialog.ts`
- `lib/templates/ui-alert-dialog-payload.ts`
- `components/ui/template-build-form.tsx`
- `components/ui/template-table.tsx`
- `components/ui/template-async-submit-button.tsx`
- `components/ui/template-confirm-submit-button.tsx`

## Contract v1

Host contract version:

- `1.0.0` (`TEMPLATE_CONTRACT_VERSION`)

Supported compatibility formats:

- exact version (`1.0.0`)
- caret range (`^1.0.0`)
- wildcard (`*`)

Compatibility helpers:

- `isTemplateContractRangeSatisfied(range, hostVersion?)`
- `resolveTemplateContractCompatibility(range, hostVersion?)`

## Component ID convention

`componentId` must use lowercase dot/kebab segments.

Examples:

- `ui.form`
- `ui.table`
- `ui.alert-dialog`
- `ui.async-submit-button`

Catalog:

- `TEMPLATE_COMPONENT_IDS` defines pilot components.
- `TEMPLATE_LOCKABLE_COMPONENT_IDS` defines which components can use `lockTemplate=true`.

## Resolution precedence

Default (`flags.templatePriority` omitted or `theme`):

1. `module_override`
2. `theme_area_override`
3. `theme_global_override`
4. `module_default`
5. `core_default`
6. `fallback` (none)

Alternative (`flags.templatePriority = 'module'`):

1. `module_override`
2. `module_default`
3. `theme_area_override`
4. `theme_global_override`
5. `core_default`
6. `fallback` (none)

`context` supports:

- `area` (`admin`, `dashboard`, `frontend`, `global`)
- `themeId`
- `moduleId`
- `route`
- `data`
- `flags.adminForceOverride`
- `flags.templatePriority` (`theme` | `module`)

## lockTemplate policy

If a module template for a lockable component sets `lockTemplate=true`:

- theme overrides are ignored by default
- module default stays authoritative
- `flags.adminForceOverride=true` allows explicit administrative override behavior

## Theme pack integration (Fase 2)

Theme packs can define `entryTemplates` (JSON manifest referenced from `theme.json`):

```json
{
  "contractRange": "^1.0.0",
  "templates": {
    "global": [
      {
        "componentId": "ui.async-submit-button",
        "templateId": "theme.global.async-submit"
      }
    ],
    "dashboard": [
      {
        "componentId": "ui.table",
        "templateId": "theme.dashboard.table"
      }
    ]
  }
}
```

Rules enforced by runtime:

- `templates.<area>` must use valid areas (`admin`, `dashboard`, `frontend`, `global`)
- duplicated `componentId` in same area is rejected
- `global` templates are loaded and used as fallback after area-specific lookup

Runtime wiring:

- `getTemplateRuntimeSnapshotForArea(area)` uses active theme selection and registers theme templates for that area.
- `resolveTemplateForArea(...)` resolves template using the area runtime snapshot.

Caching/performance notes:

- theme template manifest parsing is cached by absolute manifest path (`templatePackCache`)
- CTC keeps runtime snapshots per area via `cache(...)` in `lib/templates/runtime.ts`
- module template pack registration is deduplicated per area runtime snapshot

## Module template pack integration (Fase 3)

Modules can declare template entries in `ModuleManifest.templatePack`:

```ts
templatePack: {
  contractRange: '^1.0.0',
  defaults: [{ componentId: 'ui.table', templateId: 'mod.analytics.default.table' }],
  overrides: [{ componentId: 'ui.async-submit-button', templateId: 'mod.analytics.override.async-submit', lockTemplate: true }]
}
```

Runtime behavior:

- `defaults` register as `module_default`
- `overrides` register as `module_override`
- registration runs lazily in `resolveTemplateForArea(...)` when `context.moduleId` is present
- each module pack is registered once per runtime snapshot
- if module has no `templatePack`, controller keeps theme/core-only behavior

Validation:

- `validateModuleManifest` enforces `componentId` format and duplicate detection per `defaults`/`overrides`
- `registerModuleTemplatesFromManifest` validates payload shape and rejects duplicate `componentId` per kind

Source-host and source-package:

- `source-host`: declare `templatePack` in `src/manifest.ts`
- `source-package`: declare `templatePack` in compiled manifest, and optionally validate pack artifacts in `module.json`

`module.json` optional section for build/prepare validation:

```json
{
  "templatePack": {
    "defaultEntry": "dist/templates/defaults.json",
    "overrideEntry": "dist/templates/overrides.json",
    "contractRange": "^1.0.0"
  }
}
```

Pipeline checks:

- `modules:build` validates configured `templatePack.defaultEntry`/`overrideEntry` outputs after build
- `modules:prepare` validates configured entries exist and exposes metadata in `EXTERNAL_MODULE_META`

## `ui.table` migration (Fase 5 pilot)

Pilot integration for real rendering is now wired through:

- `components/ui/template-table.tsx`
- `lib/templates/ui-table.ts`

Flow:

1. server component renders `TemplateTable` with `{ area, route, moduleId? }`
2. `resolveTemplateForArea('ui.table', context)` selects final template entry
3. `payload` is normalized (`containerClassName`, `tableClassName`)
4. base `Table` receives merged classes + template tracing attributes:
   - `data-template-component="ui.table"`
   - `data-template-id`
   - `data-template-source`

Current pages using `TemplateTable`:

- `app/(dashboard)/admin/subscriptions/page.tsx`
- `app/(dashboard)/dashboard/subscriptions/page.tsx`

## `ui.form` migration (Sprint 10 pilot)

Server wrapper:

- `components/ui/template-build-form.tsx`

Resolver:

- `lib/templates/ui-form.ts`

Payload keys:

- `formClassName`
- `headerClassName`
- `titleClassName`
- `descriptionClassName`
- `sectionClassName`
- `sectionHeaderClassName`
- `sectionTitleClassName`
- `sectionDescriptionClassName`
- `gridClassName`
- `fieldClassName`
- `labelClassName`
- `descriptionTextClassName`
- `inputClassName`
- `textareaClassName`
- `selectClassName`
- `checkboxWrapperClassName`
- `actionsClassName`

Current usages include:

- `app/(dashboard)/admin/users/create-user-form.tsx`
- `modules/mod.example.suite/src/pages/admin-pages.tsx`

## `ui.async-submit-button` migration (Fase 5 pilot)

Server wrapper:

- `components/ui/template-async-submit-button.tsx`
- client wrapper (code-template runtime):
  - `components/ui/themed-async-submit-button.tsx`

Resolver:

- `lib/templates/ui-async-submit-button.ts`

Payload keys:

- `className`
- `iconClassName`

Current server routes using `TemplateAsyncSubmitButton` include:

- `app/(dashboard)/dashboard/subscriptions/page.tsx`
- `app/(dashboard)/admin/app-config/*`
- `app/(dashboard)/admin/orders/[orderId]/edit/page.tsx`
- `app/(dashboard)/admin/users/*`
- `app/(dashboard)/admin/subscriptions/[templateId]/edit/page.tsx`
- `app/(dashboard)/admin/suscriptions/*/edit/page.tsx`

## `ui.alert-dialog` migration (Fase 5 pilot)

Server wrapper:

- `components/ui/template-confirm-submit-button.tsx`
- client wrapper (code-template runtime):
  - `components/ui/themed-confirm-submit-button.tsx`

Resolver:

- `lib/templates/ui-alert-dialog.ts`

Payload keys:

- `triggerClassName`
- `contentClassName`
- `titleClassName`
- `descriptionClassName`
- `footerClassName`
- `cancelButtonClassName`
- `confirmButtonClassName`

Current server routes using `TemplateConfirmSubmitButton` include:

- `app/(dashboard)/dashboard/subscriptions/page.tsx`
- `app/(dashboard)/admin/users/[userId]/page.tsx`
- `app/(dashboard)/admin/subscriptions/[templateId]/edit/page.tsx`
- `app/(dashboard)/admin/suscriptions/organization/[teamId]/edit/page.tsx`

## `ui.dialog` migration (Fase 5 pilot)

Code-template wrappers:

- server usage: `ThemeCodeTemplate` with `id="ui.dialog"`
- client usage: `ThemeTemplate` with `id="ui.dialog"`

Current usages include:

- `app/(dashboard)/admin/users/create-user-dialog.tsx`

## `layout.private.shell`, `layout.private.header`, and `ui.user-menu` migration (Sprint 9)

Code-template wrappers:

- shared private shell: `app/(dashboard)/private-area-shell.tsx` with `ThemeTemplate id="layout.private.shell"`
- shared private header: `app/(dashboard)/private-area-header.tsx` with `ThemeTemplate id="layout.private.header"`
- user menu control: `app/(dashboard)/private-area-header.tsx` with `ThemeTemplate id="ui.user-menu"`

Theme defaults:

- `themes/first-backoffice/templates/layout.private.shell.tsx`
- `themes/first-backoffice/templates/layout.private.header.tsx`
- `themes/first-backoffice/templates/ui.user-menu.tsx`

Current behavior:

- private root shell is now template-driven for both `/admin` and `/dashboard` areas
- private top header is now template-driven for both `/admin` and `/dashboard` areas
- active theme selection is resolved by area in the host and applied client-side by pathname

## Admin granular sections (Sprint 9 phase 1)

New admin section template ids in host:

- `section.admin.dashboard.overview`
- `section.admin.dashboard.quick-links`
- `section.admin.dashboard.recent-activity`
- `section.admin.dashboard.module-widget`
- `section.admin.app-config-nav.panel`
- `section.admin.app-config-nav.item`

Current host wiring:

- `app/(dashboard)/admin/page.tsx` wraps each core dashboard module section with `ThemeCodeTemplate`.
- `app/(dashboard)/admin/page.tsx` wraps dynamic external widgets with fallback id `section.admin.dashboard.module-widget`.
- `app/(dashboard)/admin/app-config/section-nav.client.tsx` wraps nav panel and each item with `ThemeTemplate`.

## Admin datatable granular cells (Sprint 9 phase 2)

New section ids for admin table cells:

- `section.admin.table.users.cell`
- `section.admin.table.orders.cell`
- `section.admin.table.subscriptions.cell`
- `section.admin.table.subscriptions.templates.cell`
- `section.admin.table.payments.cell`
- `section.admin.table.logs.cell`
- `section.admin.table.suscriptions.user.cell`

Current host wiring:

- column builders use `AdminTableSlotTemplate` (`app/(dashboard)/admin/table-slot-template.tsx`)
- column factories no longer receive manual `themeId`; runtime resolution happens in `ThemeTemplate` through `ThemeRuntimeProvider` context.

## Dashboard datatable granular cells (Sprint 9 phase 2 extension)

New section ids for dashboard subscription table cells:

- `section.dashboard.table.subscriptions.organizations.cell`
- `section.dashboard.table.subscriptions.payments.cell`
- `section.dashboard.table.subscriptions.invoices.cell`

Current host wiring:

- column builders use `DashboardTableSlotTemplate` (`app/(dashboard)/dashboard/table-slot-template.tsx`)
- dashboard subscriptions table files now wrap key cells/headers with those ids:
  - `app/(dashboard)/dashboard/subscriptions/payments-data-table.tsx`
  - `app/(dashboard)/dashboard/subscriptions/invoices-data-table.tsx`
- manual `themeId` plumbing in dashboard column factories was removed; runtime context resolves active theme.

## Datatable control slots (Sprint 9 phase 3)

New shared table-control id:

- `ui.table.control`

Current host wiring:

- `components/ui/data-table.tsx` wraps control slots with `ThemeTemplate` and
  keeps fallback safety for each slot:
  - `toolbar`
  - `toolbar.filter`
  - `toolbar.actions`
  - `toolbar.columns-toggle`
  - `toolbar.columns-toggle.label`
  - `toolbar.columns-toggle.icon`
  - `toolbar.columns-toggle.menu-content`
  - `toolbar.columns-toggle.menu-item-label`
  - `body.empty`
  - `pagination`
  - `pagination.summary`
  - `pagination.actions`
  - `pagination.previous`
  - `pagination.next`
- when `template.themeId` is omitted, `DataTable` resolves theme/area from `ThemeRuntimeProvider` context.

Theme defaults:

- `themes/first-backoffice/templates/ui.table.control.tsx`

## Typed code-template data contracts (Sprint 10)

Runtime wrappers now support `id`-narrowed `data` typing for high-impact IDs.

- contract map: `lib/themes/template-data-contract.ts`
- wrappers:
  - `components/ui/theme-template.tsx`
  - `components/theme/theme-code-template.tsx`

Current typed IDs:

- `section.admin.nav`
- `layout.private.header`
- `layout.private.shell`
- `ui.table.control`
- `ui.language-switcher`
- `ui.theme-toggle`
- `ui.user-menu`

Behavior:

- known IDs get typed `data` from `TemplateDataById`.
- unknown IDs stay compatible (`data?: unknown`) during migration.
- explicit `themeId` remains supported in both wrappers.
- `ThemeTemplate` resolves `themeId` from runtime context when prop is omitted.

## Template debug metadata policy (Sprint 10)

Template tracing attributes are now debug-only by default:

- `data-template-component`
- `data-template-id`
- `data-template-source`

Runtime policy:

- helper: `lib/templates/debug.ts`
- enabled when:
  - `NODE_ENV === 'development'`, or
  - `NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA=1`
- production default emits no debug metadata.

Coverage:

- `components/ui/table.tsx`
- `components/ui/async-submit-button.tsx`
- `components/ui/confirm-submit-button.tsx`

## API surface

`createTemplateController()` returns:

- `registerCoreTemplates(entries, options?)`
- `registerThemeTemplates(themeId, entries, options?)`
- `registerModuleTemplates(moduleId, entries, options?)`
- `resolveTemplate(componentId, context)`
- `renderWithTemplate(componentId, context, fallbackRender)`
- `getResolutionTraces()`
- `clearResolutionTraces()`

`renderWithTemplate` is safe by default:

- if no template resolves, fallback renderer is used
- if template render throws, fallback renderer is used

## Trace instrumentation

Each resolution emits a trace with:

- source
- area
- theme/module ids
- route
- selected template id
- lock/admin force flags

Controller options:

- `onTrace(trace)` callback
- `traceLimit` ring-buffer limit

## Tests

- `tests/templates/template-contract.test.ts`
- `tests/templates/template-controller.test.ts`
- `tests/templates/template-theme-pack.test.ts`
- `tests/templates/template-module-pack.test.ts`
- `tests/templates/template-host-module-theme.integration.test.ts`
- `tests/templates/template-ui-form-payload.test.ts`
- `tests/templates/template-ui-async-submit-button-payload.test.ts`
- `tests/templates/template-ui-alert-dialog-payload.test.ts`
- `tests/templates/template-debug-metadata.test.ts`
- `tests/modules/module-runtime.test.ts`
- `tests/modules/modules-prepare.test.ts`
- `tests/modules/modules-build.test.ts`
