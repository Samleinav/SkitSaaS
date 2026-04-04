---
title: "Theme Pack Worked Examples"
sidebar_position: 0
---

# Theme Pack Worked Examples

Use this page when the question is "show me the exact shape of a real theme
pack" rather than "explain themes abstractly."

This page deliberately repeats the main theme docs and organizes them into two
real starting shapes:

- frontend route-owned theme
- backoffice CTC-driven theme

## Two Different Theme Jobs

In SkitSaaS, a theme usually does one of these jobs first:

1. own frontend pages through `routes.ts`
2. own admin/dashboard rendering through templates and area assets

Treat those as different starting points. That is one of the main reasons
agents get confused.

## Example A: Frontend Route Theme

This is the closest real shape to `themes/first-frontend`.

```txt
themes/brand-frontend/
  package.json
  theme.json
  config.ts
  routes.ts
  templates.json
  tokens.css
  global.css
  assets/
    favicon-frontend.svg
  locales/
    frontend/
      en.json
      es.json
  templates/
    layout.frontend.shell.tsx
    page.frontend.home.tsx
    page.frontend.pricing.tsx
    system.not-found.tsx
```

### Minimal `theme.json`

```json
{
  "themeId": "theme.brand.frontend",
  "version": "1.0.0",
  "areas": ["frontend"],
  "mode": "tokens",
  "entryTokens": "tokens.css",
  "entryTemplates": "templates.json",
  "themeRange": "^1.0.0",
  "displayName": "Brand Frontend"
}
```

This tells the host:

- the pack only owns `frontend`
- tokens are part of the entry surface
- template metadata is part of the pack

### Optional `templates.json`

When the theme wants explicit template-pack metadata, keep it small:

```json
{
  "contractRange": "^1.0.0",
  "templates": {}
}
```

Many packs will still do most of their real template work through
`templates/*.tsx`.

When the goal is an area-scoped override, use the metadata explicitly:

```json
{
  "contractRange": "^1.0.0",
  "templates": {
    "admin": [
      {
        "componentId": "ui.table",
        "templateId": "theme.admin.table"
      }
    ],
    "global": [
      {
        "componentId": "ui.async-submit-button",
        "templateId": "theme.global.async-submit"
      }
    ]
  }
}
```

Use this when you need to say clearly:

- `ui.table` is admin-only
- another override should stay global fallback

### Minimal `config.ts`

```ts
import { defineThemeConfig } from '@skitsaas/sdk';

export default defineThemeConfig({
  head: {
    fonts: [
      'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'
    ]
  },
  assets: {
    globalCssByArea: {
      frontend: 'global.css'
    },
    faviconByArea: {
      frontend: 'assets/favicon-frontend.svg'
    },
    notFoundTemplateByArea: {
      frontend: 'system.not-found'
    }
  }
});
```

This is the clean starting point for a marketing/frontstore theme. It is about
page ownership and area assets, not about admin/dashboard shells.

### `routes.ts`

```ts
const routes = [
  {
    path: '/__layout',
    loader: () => import('./templates/layout.frontend.shell')
  },
  {
    path: '/',
    loader: () => import('./templates/page.frontend.home')
  },
  {
    path: '/pricing',
    loader: () => import('./templates/page.frontend.pricing')
  },
  {
    path: '/404',
    loader: () => import('./templates/system.not-found')
  }
];

export default routes;
```

Use this when the theme should own marketing pages directly.

## Example B: Backoffice Theme

This is the closest real shape to `themes/first-backoffice`.

```txt
themes/brand-backoffice/
  package.json
  theme.json
  config.ts
  tokens.css
  global.css
  assets/
    favicon-admin.svg
    favicon-dashboard.svg
  locales/
    admin/
      fr.json
    dashboard/
      fr.json
  templates/
    layout.private.shell.tsx
    layout.private.header.tsx
    ui.table.tsx
    ui.async-submit-button.tsx
    ui.user-menu.tsx
    ui.alert-dialog.tsx
    system.not-found.tsx
    admin/
      layout.admin.shell.tsx
      page.admin.home.tsx
    dashboard/
      layout.dashboard.shell.tsx
      page.dashboard.home.tsx
```

### Minimal `theme.json`

```json
{
  "themeId": "theme.brand.backoffice",
  "version": "1.0.0",
  "areas": ["admin", "dashboard"],
  "mode": "tokens",
  "entryTokens": "tokens.css",
  "themeRange": "^1.0.0",
  "displayName": "Brand Backoffice"
}
```

If the pack also wants explicit template-pack metadata, extend `theme.json`
with `entryTemplates`:

```json
{
  "themeId": "theme.brand.backoffice",
  "version": "1.0.0",
  "areas": ["admin", "dashboard"],
  "mode": "tokens",
  "entryTokens": "tokens.css",
  "entryTemplates": "templates.json",
  "themeRange": "^1.0.0",
  "displayName": "Brand Backoffice"
}
```

### Optional `templates.json` For Backoffice Overrides

Use explicit metadata when you want the area split to be obvious in docs and in
review:

```json
{
  "contractRange": "^1.0.0",
  "templates": {
    "admin": [
      {
        "componentId": "ui.form",
        "templateId": "theme.admin.form"
      },
      {
        "componentId": "ui.table",
        "templateId": "theme.admin.table"
      },
      {
        "componentId": "ui.async-submit-button",
        "templateId": "theme.admin.async-submit"
      }
    ],
    "dashboard": [
      {
        "componentId": "ui.user-menu",
        "templateId": "theme.dashboard.user-menu"
      }
    ]
  }
}
```

This is the clearest starter when the requirement is:

- override `ui.form` and `ui.table` only in `admin`
- keep `dashboard` using a different or smaller override set
- document the target area without relying only on filename inference

### Minimal `config.ts`

```ts
import { defineThemeConfig } from '@skitsaas/sdk';

export default defineThemeConfig({
  additionalLocales: ['fr'],
  assets: {
    globalCssByArea: {
      admin: 'global.css',
      dashboard: 'global.css'
    },
    faviconByArea: {
      admin: 'assets/favicon-admin.svg',
      dashboard: 'assets/favicon-dashboard.svg'
    },
    loginThemeAreaByPath: {
      '/admin/login': 'admin',
      '/login': 'dashboard',
      '/sign-up': 'dashboard'
    },
    notFoundTemplateByArea: {
      admin: 'system.not-found',
      dashboard: 'system.not-found'
    }
  }
});
```

This is the clean starting point for admin/dashboard/login theming.

## Frontend Theme Versus Backoffice Theme

Use this rule to decide where a change belongs:

- if the work changes `/`, `/pricing`, or other marketing routes, start in
  `routes.ts`
- if the work changes admin/dashboard shells, forms, tables, dialogs, or user
  menu behavior, start in `templates/` and `config.ts`

### Practical Example

If you want a new landing page hero:

- frontend route theme
- edit `routes.ts` and `templates/page.frontend.home.tsx`

If you want a new admin table renderer:

- backoffice theme
- edit `templates/ui.table.tsx`
- ensure the theme registers the matching component ID

## CTC Override Flow

This is the main behavior agents tend to miss.

Example flow for `ui.table`:

1. host or module renders a table through the template-aware contract
2. runtime asks CTC for the winning template for `ui.table`
3. current area is considered, such as `admin` or `dashboard`
4. active theme templates are checked
5. module defaults or overrides may also participate
6. winning template file is rendered

That means a theme can change real rendering, not just CSS.

### Where The Template Is Registered

In practice, a backoffice theme usually registers the override through the
template file itself:

- `templates/ui.table.tsx` -> `componentId: "ui.table"`
- `templates/ui.async-submit-button.tsx` ->
  `componentId: "ui.async-submit-button"`
- `templates/admin/page.admin.home.tsx` -> `componentId: "page.admin.home"`

This file-name convention is the easiest mental model for theme work. Use
`templates.json` only when the pack also needs explicit template-pack metadata.

### Concrete Registration Mindset

For a backoffice theme, document overrides as a mapping between:

- component ID
- template file
- target area

Example:

- `ui.table` -> `templates/ui.table.tsx` -> `admin`, `dashboard`
- `ui.user-menu` -> `templates/ui.user-menu.tsx` -> `admin`, `dashboard`
- `system.not-found` -> `templates/system.not-found.tsx` -> `admin`, `dashboard`

### Good Theme Template Checklist

When adding a template override, document:

- component ID, for example `ui.table`
- target area, for example `admin`
- template file, for example `templates/ui.table.tsx`
- whether a module override could still beat it

## Locale Example

Area-scoped locale overrides should look like this:

```txt
themes/first-backoffice/locales/admin/fr.json
themes/first-backoffice/locales/dashboard/fr.json
themes/first-frontend/locales/frontend/es.json
```

Example `themes/first-backoffice/locales/admin/fr.json`:

```json
{
  "admin.nav.home": "Accueil",
  "admin.payments.title": "Paiements",
  "admin.orders.create.submit": "Creer la commande"
}
```

Example `themes/first-frontend/locales/frontend/es.json`:

```json
{
  "frontend.hero.title": "Lanza tu SaaS mas rapido",
  "frontend.pricing.cta": "Ver planes"
}
```

These files layer on top of host translations for the active area. They do not
replace the whole translation registry.

## Real Repo Examples To Cross-Check

Use these theme packs when you want to compare against the current repo:

- `themes/first-frontend`
  smallest route-driven frontend example
- `themes/first-backoffice`
  clean admin/dashboard template example
- `themes/nexustheme`
  broader, more productized backoffice theme

## Build Checklist

Before calling a theme ready, verify:

1. `theme.json` areas match the real pack purpose
2. `config.ts` declares area assets intentionally
3. frontend route themes use `routes.ts`
4. backoffice themes explain which component IDs they override
5. locale files are area-scoped
6. `pnpm themes:prepare` succeeds

## Related Docs

- `./getting-started.md`
- `./templates-and-ctc.md`
- `./frontend-routes.md`
- `./backoffice-assets-and-locales.md`
- `../themes-and-ctc.md`
