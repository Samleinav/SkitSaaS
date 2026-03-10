---
name: theme-frontend-routes
description: Add or modify frontend route-driven components inside a theme pack. Use this skill when creating home pages, pricing pages, layout shells, or any route-driven frontend UI owned by a theme.
---

# theme-frontend-routes

## Scope

`routes.ts`, frontend route components (`frontend/*.tsx`), and frontend area slot behavior inside `themes/<themeId>/`.

## Required References

- `docs/themes/01-theme-runtime.md` — area resolution, `THEME_FRONTEND` ENV, frontend area routing
- `docs/themes/02-theme-authoring-guide.md` — `routes.ts` contract, frontend component conventions
- `docs/context-area/01-frontend-routing-slots.md` — frontend slot model, area fallback chains

## Frontend Theme Structure

```
themes/<themeId>/
  routes.ts
  frontend/
    layout-shell.tsx
    home-page.tsx
    pricing-page.tsx
    not-found-page.tsx
```

Only frontend themes need `routes.ts`. Admin/dashboard-only themes do not need it.

## routes.ts Contract

```ts
// themes/<themeId>/routes.ts
export const frontendRoutes = [
  { path: '/',           component: () => import('./frontend/home-page') },
  { path: '/pricing',    component: () => import('./frontend/pricing-page') },
  { path: '/not-found',  component: () => import('./frontend/not-found-page') },
];

export const layoutShell = () => import('./frontend/layout-shell');
```

## Area Slot Behavior

Frontend themes are selected via `THEME_FRONTEND` at build time. Route resolution:

- `/` → `frontend` area → uses `THEME_FRONTEND` pack
- `/pricing` → `frontend` area
- Public routes without an explicit frontend theme → host default

Theme components must be self-contained. Do not import from:
- `@/app/*`
- `@/lib/*`
- Other themes

Allowed imports inside theme frontend components:
- Theme-local files (`./`, `../`)
- `@skitsaas/sdk` (client-safe helpers)
- Third-party UI libraries declared in the theme's `package.json`

## Escalation Rule

If a frontend route needs to read module data or use module nav items, the data flow must come through the host layout shell props (passed from the server-side dispatcher), not via direct module imports.

## Verification

```bash
THEME_FRONTEND=theme.<name>.frontend pnpm themes:prepare
pnpm exec tsc --noEmit
```

Check `lib/themes/selection.generated.ts` — frontend theme entry should resolve correctly.
