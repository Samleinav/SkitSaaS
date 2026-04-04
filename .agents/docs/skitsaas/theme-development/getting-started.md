---
title: "Theme Development Getting Started"
sidebar_position: 0
---

# Theme Development Getting Started

This page is the shortest path from "I need a theme" to a correct theme pack
shape in SkitSaaS.

## Minimum Theme Structure

Typical theme pack:

```txt
themes/<your-theme>/
  package.json
  theme.json
  config.ts
  routes.ts
  templates.json
  tokens.css
  global.css
  templates/
  frontend/
  locales/
  assets/
```

Not every theme needs every folder, but the important files are:

- `theme.json`
- `config.ts`
- `routes.ts` for frontend route-driven themes
- `templates/*.tsx` for code-driven CTC templates
- `templates.json` when the pack declares explicit template metadata

## `theme.json`

This is the pack manifest that declares:

- `themeId`
- `version`
- supported `areas`
- theme mode
- entry files such as tokens and templates

## `config.ts`

This is the canonical config entry for:

- assets
- head config
- optional locale exposure
- build-time theme behavior

## Build-Time Selection

Theme selection is build-time driven through ENV and theme preparation.

Common selectors:

- `THEME_ADMIN`
- `THEME_DASHBOARD`
- `THEME_FRONTEND`

Normal preparation command:

```bash
pnpm themes:prepare
```

## Area Thinking

Theme work should always be scoped by area:

- `frontend`
- `dashboard`
- `admin`

Auth route nuance also matters:

- `/admin/login` resolves with admin theme selection
- `/login` and `/sign-up` resolve with dashboard theme selection

## Canonical Theme Questions

Before building, decide:

1. which areas the theme owns
2. whether it needs route-driven frontend pages
3. which CTC component IDs it overrides
4. whether it ships locale overrides

## Common Mistakes

- treating `components/ui/*` as the whole theme system
- forgetting build-time selection and generated artifacts
- not separating frontend route concerns from backoffice template concerns
