---
title: Theme Authoring Guide
sidebar_position: 16
---

# Theme Authoring Guide

This guide documents the minimum contract to create a theme pack compatible with host runtime and CTC.

Transition note (2026-02-13): build-time-only theme selection is being rolled out. The target contract is documented in [Theme Build-Time Only ADR](./04-theme-build-adr.md).

## Minimal structure

```
themes/<your-theme>/
  package.json
  theme.json
  config.ts                # canonical config entry (build-time model)
  routes.ts                # frontend route registry (frontend themes only)
  tokens.css
  templates.json            # optional
  global.css                # optional (if referenced in config.ts/assets)
  locales/                  # optional flat translations
    admin/
      en.json
    dashboard/
      es.json
  frontend/                 # optional route-driven frontend components
    layout-shell.tsx
    home-page.tsx
    pricing-page.tsx
    not-found-page.tsx
  templates/                # optional code-driven templates
    admin/                  # optional grouping by area
      layout.admin.shell.tsx
      page.admin.home.tsx
    dashboard/              # optional grouping by area
      layout.dashboard.shell.tsx
      page.dashboard.home.tsx
  assets/                   # optional favicon/assets
```

## `theme.json` required fields

```json
{
  "themeId": "theme.example.frontend",
  "version": "1.0.0",
  "areas": ["frontend"],
  "mode": "tokens",
  "entryTokens": "tokens.css",
  "entryTemplates": "templates.json",
  "themeRange": "^1.0.0"
}
```

## Frontend routes (`routes.ts`)

Frontend themes are route-driven.

- Define `routes.ts` (or `routes.tsx`) in the theme root.
- Each route entry uses:
  - `path` (for example `/`, `/pricing`, `/404`, `/__layout`)
  - `loader` (dynamic import returning the route component)
  - `metadata` (optional)
- Host frontend pages render through `ThemeFrontendRoute` with explicit fallback.

Example:

```ts
const routes = [
  { path: '/__layout', loader: () => import('./frontend/layout-shell') },
  { path: '/', loader: () => import('./frontend/home-page') },
  { path: '/pricing', loader: () => import('./frontend/pricing-page') },
  { path: '/404', loader: () => import('./frontend/not-found-page') }
];

export default routes;
```

## Code templates

- `themes:prepare` discovers `templates/*.tsx` and maps each filename to `componentId`.
- Discovery is recursive, so you can organize by folders (`templates/admin/*`, `templates/dashboard/*`, etc.).
- Example: `templates/admin/page.admin.home.tsx` => `componentId: "page.admin.home"`.
- For recursive files, `componentId` still comes from the filename, not the folder name.
- Backoffice and login routes render via `ThemeCodeTemplate` and always keep fallback safety.

### Backoffice template style (simplified)

For `first-backoffice`-style packs, default authoring is intentionally simple:

- template files render direct HTML/TSX from received `data`.
- avoid shell-only wrapper components as mandatory middleware.
- keep only runtime/CSS-required attributes in production markup.
- treat template debug attributes as optional diagnostics, not styling dependencies.
- optional helpers can be imported from SDK (`@skitsaas/sdk`) to avoid repeating local normalizers:
  - `toStringOrFallback`
  - `toStringOrNull`
  - `toNumberOrFallback`
  - `mergeClassNames`

Backoffice-required component IDs (build enforcement):

- `layout.private.shell`
- `layout.private.header`
- `layout.admin.shell`
- `layout.admin.app-config.shell`
- `page.admin.home`
- `page.admin.logs`
- `page.admin.users`
- `page.admin.user.detail`
- `page.admin.orders`
- `page.admin.orders.create`
- `page.admin.orders.edit`
- `page.admin.payments`
- `page.admin.suscriptions`
- `page.admin.suscriptions.user.edit`
- `page.admin.suscriptions.organization.edit`
- `page.admin.subscriptions.templates`
- `page.admin.subscriptions.create`
- `page.admin.subscriptions.edit`
- `page.admin.app-config.home`
- `page.admin.app-config.general`
- `page.admin.app-config.payment-methods`
- `page.admin.app-config.email`
- `page.admin.app-config.modules`
- `page.admin.app-config.theme`
- `section.admin.nav`
- `section.admin.breadcrumb`
- `section.admin.app-config-nav`
- `section.admin.app-config-nav.panel`
- `section.admin.app-config-nav.item`
- `section.admin.dashboard.overview`
- `section.admin.dashboard.quick-links`
- `section.admin.dashboard.recent-activity`
- `section.admin.dashboard.module-widget`
- `section.admin.table.users.cell`
- `section.admin.table.orders.cell`
- `section.admin.table.subscriptions.cell`
- `section.admin.table.subscriptions.templates.cell`
- `section.admin.table.payments.cell`
- `section.admin.table.logs.cell`
- `section.admin.table.suscriptions.user.cell`
- `section.admin.metrics-grid`
- `layout.dashboard.shell`
- `page.dashboard.home`
- `page.dashboard.general`
- `page.dashboard.activity`
- `page.dashboard.activity.loading`
- `page.dashboard.security`
- `page.dashboard.subscriptions`
- `section.dashboard.table.subscriptions.organizations.cell`
- `section.dashboard.table.subscriptions.payments.cell`
- `section.dashboard.table.subscriptions.invoices.cell`
- `page.login.user`
- `page.login.admin`
- `page.login.signup`
- `ui.alert-dialog`
- `ui.async-submit-button`
- `ui.dialog`
- `ui.theme-toggle`
- `ui.language-switcher`
- `ui.user-menu`
- `ui.table`
- `ui.table.control`
- `system.not-found`

`themes:prepare` fails the build when:

- the selected `THEME_ADMIN` or `THEME_DASHBOARD` theme misses required host IDs for its area
- baseline `theme.first.backoffice` is missing or does not cover required admin/dashboard IDs

## Critical `data` schema (v1)

Host routes pass `data` into:

- `ThemeFrontendRoute` for frontend route-driven slots.
- `ThemeCodeTemplate` for admin/dashboard/login template slots.

The minimum v1 contract is:

- frontend route `/__layout`: no required keys (`data` can be `{}`).
- frontend route `/`: `badge`, `heroTitleLine1`, `heroTitleLine2`, `heroDescription`, `viewCodeLabel`, `featureLabel`, `featureHighlightOne`, `featureHighlightTwo`, `featureHighlightThree`, `showcaseTitle`, `securityLabel`, `securityValue`, `billingLabel`, `billingValue`, `ctaTitle`, `ctaDescription`, `pricingLabel`, `viewCodeHref`, `featureCards`.
- frontend route `/pricing`: `badgeLabel`, `title`, `subtitle`.
- `layout.private.shell`: `area`, `route`.
- `layout.admin.shell`: `heading`.
- `layout.admin.app-config.shell`: `section`.
- `page.admin.home`: `title`.
- `page.admin.logs`: `title`, `description`, `tab`.
- `page.admin.app-config.home`: `title`, `description`.
- `page.admin.app-config.general`: `title`, `description`.
- `page.admin.app-config.payment-methods`: `title`, `description`, `provider`.
- `page.admin.app-config.email`: `title`, `description`, `provider`.
- `page.admin.app-config.modules`: `title`, `description`, `runtimeMode`.
- `page.admin.app-config.theme`: `title`, `description`, `mode`.
- `page.admin.users`: `title`.
- `page.admin.user.detail`: `title`, `description`, `userId`.
- `page.admin.orders`: `title`, `description`, `createLabel`.
- `page.admin.orders.create`: `title`, `description`, `initialTargetType`.
- `page.admin.orders.edit`: `title`, `description`, `orderId`.
- `page.admin.payments`: `title`, `description`.
- `page.admin.suscriptions`: `title`, `description`, `scope`.
- `page.admin.suscriptions.user.edit`: `title`, `description`, `userId`.
- `page.admin.suscriptions.organization.edit`: `title`, `description`, `teamId`.
- `page.admin.subscriptions.templates`: `title`, `description`.
- `page.admin.subscriptions.create`: `title`.
- `page.admin.subscriptions.edit`: `title`.
- `section.admin.nav`: `variant`, `mode`, `moduleItemsCount`, `navItems`.
- `section.admin.breadcrumb`: `title`, `backToAppConfigLabel`.
- `section.admin.app-config-nav`: `section`.
- `section.admin.metrics-grid`: `variant`, `columns`.
- `section.admin.dashboard.module-widget`: `title`, `moduleWidgetId`, `moduleWidgetIndex`, `moduleWidgetKind`.
- `layout.dashboard.shell`: `heading`.
- `page.dashboard.home`: `title`.
- `layout.private.header`: `area`, `controlsSlot`.
- `layout.private.shell`: `area`, `route`.
- `ui.theme-toggle`: `area`, `slot`, optional `showLabel`, optional `variant`, optional `mode`.
- `ui.language-switcher`: `area`, `slot`, optional `variant`, optional `mode`.
- `ui.user-menu`: `area`, `slot`, optional `tone`.
- `ui.table.control`: `area`, `slot` (plus optional slot metadata).
- `page.login.user`: `title`.
- `page.login.admin`: `title`.
- `page.login.signup`: `title`.
- frontend route `/404` and backoffice `system.not-found`: `title`, `message`.

These contracts are validated by `tests/theme/theme-slot-data-contract.test.ts`.

Typed high-impact contract map (host-side) lives in:

- `lib/themes/template-data-contract.ts`

`ThemeTemplate` and `ThemeCodeTemplate` use this map to type `data` when `id` matches a known key.

### `themeId` resolution rules

Client wrapper (`ThemeTemplate`) behavior:

- if `themeId` prop is provided, it is used as-is.
- if omitted, it resolves from `ThemeRuntimeProvider` context.

When explicit `themeId` is still mandatory:

- when rendering outside any `ThemeRuntimeProvider`.
- when intentionally rendering with a non-active area theme.
- when composing cross-area shell UI where active area is derived manually (for example shared private shell/header).

### Debug metadata policy

`data-template-*` debug attributes are emitted only when debug mode is active:

- `NODE_ENV === 'development'`, or
- `NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA=1`.

Helper:

- `lib/templates/debug.ts`

## Theme assets by area (`config.ts` preferred)

## Theme translations

Themes use the same flat translator style as the host runtime. Inside theme
components, call `useI18n({ themeId, area })` and translate natural keys
directly:

```tsx
import { useI18n } from '@skitsaas/sdk';

export function ThemeActionLabel({ themeId }: { themeId?: string }) {
  const t = useI18n({ themeId, area: 'admin' });
  return <span>{t('Cancel')}</span>;
}
```

Author translation files here:

```text
themes/<themeId>/locales/<area>/<locale>.json
```

Example:

```json
{
  "Cancel": "Cancelar",
  "Admin table": "Tabla admin"
}
```

Rules:

- JSON must stay flat: `English key -> translated value`
- supported areas are `global`, `frontend`, `admin`, `dashboard`, and `login`
- `global` is merged first, then the current area
- theme keys override core flat translations for the active `themeId + area`
- missing keys fall back to the core translator

Preferred declaration lives in `config.ts` under `assets`:

```ts
import { defineThemeConfig } from '@skitsaas/sdk';

export default defineThemeConfig({
  assets: {
    globalCssByArea: {
      frontend: 'global.css'
    },
    additionalCssByArea: {
      frontend: ['styles/landing.css']
    },
    additionalScriptByArea: {
      frontend: ['scripts/landing.js']
    },
    ignoreCoreCssByArea: {
      frontend: true
    },
    ignoreCoreScriptByArea: {
      frontend: true
    },
    faviconByArea: {
      frontend: 'assets/favicon.svg'
    },
    notFoundTemplateByArea: {
      frontend: 'system.not-found'
    }
  }
});
```

Rules:

- paths are resolved relative to the theme pack root
- paths escaping the theme directory are rejected
- missing assets do not crash runtime; host fallback remains active
- if `ignoreCoreCssByArea` is enabled for an area, that theme must provide compatible CSS for that area

## `config.ts`

Use only SDK contract imports:

```ts
import { defineThemeConfig } from '@skitsaas/sdk';
```

Do not import host internals from `@/lib/*` inside `themes/*`.

## Validation workflow

Run after theme changes:

```bash
pnpm themes:prepare
npx tsx --test tests/theme/theme-route-smoke.test.ts
npx tsx --test tests/theme/theme-slot-data-contract.test.ts
```

For broader verification:

```bash
npx tsx --test tests/theme/theme-assets-runtime.test.ts
npx tsx --test tests/theme/theme-code-template.test.tsx
npx tsx --test tests/theme/theme-pack-import-boundaries.test.ts
```
