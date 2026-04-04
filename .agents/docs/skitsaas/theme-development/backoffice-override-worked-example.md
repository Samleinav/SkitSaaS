---
title: "Backoffice Override Worked Example"
sidebar_position: 0
---

# Backoffice Override Worked Example

Use this page when the prompt is not just "make a theme" but "show me the exact
shape of a backoffice theme that overrides admin and dashboard UI intentionally,
without guessing where precedence, area split, or login surfaces come from."

This example is the companion to `theme-pack-worked-examples.md`. That page
shows the general pack shape. This page shows the sharper backoffice case that
agents tend to struggle with:

- admin-only `ui.form` and `ui.table` overrides
- dashboard-specific shell or user-menu overrides
- login and not-found surfaces
- precedence issues when a module also provides template overrides

## Scenario

Assume we want `theme.brand.backoffice-pro` with these goals:

- change admin form and table rendering
- keep dashboard using a different shell and user menu treatment
- theme `/admin/login` from `admin` and `/login` from `dashboard`
- make precedence obvious when a module pack also contributes `ui.table`
- debug why a theme change is not visible without reading `lib/templates/*`

## Recommended Tree

```txt
themes/brand-backoffice-pro/
  package.json
  theme.json
  config.ts
  templates.json
  tokens.css
  global.css
  assets/
    favicon-admin.svg
    favicon-dashboard.svg
  locales/
    admin/
      en.json
    dashboard/
      en.json
  templates/
    layout.private.shell.tsx
    layout.private.header.tsx
    ui.form.tsx
    ui.table.tsx
    ui.async-submit-button.tsx
    ui.user-menu.tsx
    system.not-found.tsx
    page.login.admin.tsx
    page.login.user.tsx
    admin/
      layout.admin.shell.tsx
      page.admin.home.tsx
    dashboard/
      layout.dashboard.shell.tsx
      page.dashboard.home.tsx
```

## `theme.json`

For a serious backoffice pack, declare areas and template metadata explicitly:

```json
{
  "themeId": "theme.brand.backoffice-pro",
  "version": "1.0.0",
  "areas": ["admin", "dashboard"],
  "mode": "tokens",
  "entryTokens": "tokens.css",
  "entryTemplates": "templates.json",
  "themeRange": "^1.0.0",
  "displayName": "Brand Backoffice Pro"
}
```

`entryTemplates` matters here because the whole point is making the override
surface explicit instead of relying only on file discovery.

## `config.ts`

Keep assets and auth-area routing intentional:

```ts
import { defineThemeConfig } from '@skitsaas/sdk';

export default defineThemeConfig({
  additionalLocales: ['en'],
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

This is the important split:

- auth pages do not all share one theme area
- `/admin/login` belongs to admin
- `/login` and `/sign-up` belong to dashboard

## `templates.json`

This is the clearest way to document area-scoped overrides:

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
      },
      {
        "componentId": "page.admin.home",
        "templateId": "theme.admin.home"
      }
    ],
    "dashboard": [
      {
        "componentId": "layout.dashboard.shell",
        "templateId": "theme.dashboard.shell"
      },
      {
        "componentId": "ui.user-menu",
        "templateId": "theme.dashboard.user-menu"
      }
    ],
    "global": [
      {
        "componentId": "system.not-found",
        "templateId": "theme.system.not-found"
      }
    ]
  }
}
```

If the prompt says:
"override `ui.table` only in admin, but leave dashboard alone,"
this is the shortest reliable answer.

## File Mapping Rule

Use this mapping model:

- `templates/ui.form.tsx`
  override reusable form rendering
- `templates/ui.table.tsx`
  override reusable table rendering
- `templates/ui.async-submit-button.tsx`
  override reusable submit UX
- `templates/ui.user-menu.tsx`
  override user-menu behavior
- `templates/admin/page.admin.home.tsx`
  override one admin page
- `templates/dashboard/layout.dashboard.shell.tsx`
  override dashboard shell framing

Prefer:

- `ui.*` when the change should affect many screens
- `page.*` when the change is local to one page
- `layout.*` when the change is shell-level

## Minimal Template Ownership

For this scenario, the expected file-to-idea map is:

- `templates/ui.form.tsx`
  admin and dashboard form wrapper behavior
- `templates/ui.table.tsx`
  reusable table chrome
- `templates/ui.async-submit-button.tsx`
  submit button renderer, unless a module lock blocks it
- `templates/ui.user-menu.tsx`
  dashboard notification and account chrome
- `templates/page.login.admin.tsx`
  admin login surface
- `templates/page.login.user.tsx`
  dashboard login surface

## Precedence Example

Assume the active runtime also enables a module pack that contributes:

- `module_default` for `ui.table`
- locked `module_override` for `ui.async-submit-button`

Then the practical outcome is:

1. `ui.table`
   theme can still win or lose depending on backoffice priority mode
2. `ui.async-submit-button`
   a locked module override keeps control unless `adminForceOverride=true`
3. `ui.user-menu`
   theme wins normally if no module pack targets it

This is why "I changed the theme file but nothing happened" is often a
precedence question, not a CSS problem.

## Debugging Flow

When a backoffice override seems ignored, check in this order:

1. is the target `componentId` correct
2. is the target area `admin` or `dashboard`
3. did `pnpm themes:prepare` regenerate outputs
4. is a module pack also contributing the same `componentId`
5. is the component lockable and currently locked
6. do debug attributes show the winning template source

Use debug metadata when available:

- `data-template-component`
- `data-template-id`
- `data-template-source`

## Prompt Shortcuts

If the user asks for:

- "admin table theme only"
  start with `templates.json` and `templates/ui.table.tsx`
- "dashboard shell plus user menu"
  start with `templates.json`, then `templates/dashboard/*`
- "login theme mismatch"
  start with `config.ts` and `loginThemeAreaByPath`
- "why does the module button still win"
  start with precedence and `lockTemplate`

## Validation Checklist

Before calling the theme ready, verify:

1. `pnpm themes:prepare`
2. selected theme supports `admin` and `dashboard`
3. `/admin/login` renders with admin theme expectations
4. `/login` renders with dashboard theme expectations
5. `ui.form` and `ui.table` changes apply only in admin when intended
6. precedence behavior matches the active module/theme setup

## Related Docs

- `./theme-pack-worked-examples.md`
- `./template-precedence-and-locking.md`
- `./override-catalog.md`
- `./build-time-selection-and-adr.md`
- `../themes-and-ctc.md`
