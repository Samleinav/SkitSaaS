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
- `/404`

This is how the theme provides route-owned frontend pages without modifying the
host app tree directly.

## What Belongs Here

Use frontend theme routes for:

- home page
- pricing page
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

- treating portal pages as if they were frontend theme routes
- mixing route-driven frontend pages and backoffice templates into one undifferentiated folder
