---
title: "Theme Backoffice, Assets, And Locales"
sidebar_position: 0
---

# Theme Backoffice, Assets, And Locales

This page groups the parts of theme work that usually matter after the initial
pack structure is already in place.

## Backoffice Themes

Backoffice themes usually care about:

- admin shell rendering
- dashboard shell rendering
- `ui.user-menu`
- form and table templates
- metrics and page-level template slots

This is where CTC and theme assets meet.

## Assets

Theme packs can own:

- tokens
- global CSS
- additional CSS
- scripts
- favicons
- not-found assets by area

Those assets are prepared into generated runtime output during `pnpm themes:prepare`.

## Locales

Themes can ship area-scoped locale overrides in:

```txt
themes/<theme>/locales/<area>/<locale>.json
```

Supported areas typically include:

- `global`
- `frontend`
- `admin`
- `dashboard`
- `login`

Use flat natural-key translations for new theme work.

## Runtime Reminder

Theme locale overrides do not replace the whole host translation story.
They layer on top of the host/core flat registry for the active theme and area.

## Good Default Checklist

1. define the theme pack
2. decide which areas it owns
3. decide which component IDs it overrides
4. add assets and locale overrides intentionally
5. prepare the theme and verify generated artifacts

## Common Mistakes

- adding locale files without thinking about area scope
- treating a backoffice theme like a frontend-only route theme
- making UI promises in docs without naming the relevant template slot or component ID
