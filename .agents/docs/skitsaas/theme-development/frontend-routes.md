---
title: "Theme Frontend Routes"
sidebar_position: 0
---

# Theme Frontend Routes

Frontend themes in SkitSaaS are route-driven.

## The Route File

Frontend theme packs define route entries in:

- `routes.ts`

Typical entries include:

- `/__layout`
- `/`
- `/pricing`
- `/outputs`
- `/404`

This is how the theme provides route-owned frontend pages without modifying the
host app tree directly.

Core host pages like `/`, `/pricing`, and `/404` still render through explicit
`ThemeFrontendRoute` calls. For additional non-core public paths, the frontend
catch-all checks module aliases first and then tries the active theme route
registry before returning `notFound()`.

## What Belongs Here

Use frontend theme routes for:

- home page
- pricing page
- extra public theme-owned pages such as `/outputs`
- shared layout shell
- not-found page

## What Does Not Belong Here

Do not confuse frontend route-driven theming with:

- portal routing
- module dispatcher routing
- admin/dashboard CTC templates

Those are different systems.

## Good Default Structure

```txt
themes/<theme>/
  routes.ts
  frontend/
    layout-shell.tsx
    home-page.tsx
    pricing-page.tsx
    not-found-page.tsx
```

## Common Mistakes

- expecting a theme route to override a frontend module alias
- expecting rich host-loaded data on a catch-all theme route; only request path
  and `searchParams` are guaranteed there
- treating portal pages as if they were frontend theme routes
- mixing route-driven frontend pages and backoffice templates into one undifferentiated folder
