# Theme Packs

This directory contains external theme packs consumed by `pnpm themes:prepare`.

## Current packs

1. `theme.frontend.sandbox` (`themes/frontend-sandbox`)
- Area: `frontend`
- Purpose: visual QA sandbox for public routes.
- Style mode: tokens + `templates.json`.

2. `theme.first.frontend` (`themes/first-frontend`)
- Area: `frontend`
- Purpose: scaffold pack for first real frontend migration.
- Includes:
  - `tokens.css`
  - `global.css` (declared in `config.ts`)
  - `routes.ts` for route-driven frontend dispatch
  - route components (`/__layout`, `/`, `/pricing`, `/404`)

3. `theme.shadcn.dashboard.frontend` (`themes/shadcn-dashboard-frontend`)
- Area: `frontend`
- Purpose: richer shadcn-inspired frontend pack for public routes.
- Includes:
  - `tokens.css`
  - `global.css` (declared in `config.ts`)
  - `routes.ts` for route-driven frontend dispatch
  - route components (`/__layout`, `/`, `/pricing`, `/404`)

4. `theme.first.backoffice` (`themes/first-backoffice`)
- Areas: `admin`, `dashboard`
- Purpose: scaffold pack for first real admin/dashboard/login migration.
- Includes:
  - `tokens.css`
  - `global.css` (declared in `config.ts`)
  - template placeholders (`layout.admin.shell`, `page.admin.home`, `layout.dashboard.shell`, `page.dashboard.home`, login pages, `system.not-found`)
  - `ui.user-menu` notification center for persisted private notifications

5. `theme.nexus` (`themes/nexustheme`)
- Areas: `admin`, `dashboard`
- Purpose: shadcn-inspired backoffice pack with richer private-area components.
- Includes:
  - `tokens.css`
  - `global.css` (declared in `config.ts`)
  - admin/dashboard template set
  - `ui.user-menu` notification center for persisted private notifications

## File layout per pack

- `theme.json`: manifest used by `themes:prepare`.
- `tokens.css`: token variables injected by runtime (`ThemeTokensStyle`).
- `templates.json`: optional CTC template entries by area.
- `config.ts`: optional runtime provider/head/assets config.
- `routes.ts`: optional/required for selected frontend themes in route-driven mode.
- `locales/<area>/<locale>.json`: optional flat translation overrides for `useI18n({ themeId, area })`.
- `templates/*.tsx`: optional code-driven templates registered by `themes:prepare`.

## Prepare and validate

```bash
pnpm themes:prepare
```

This regenerates:

- `lib/themes/external.generated.ts`
- `lib/themes/code-registry.generated.ts`
- `lib/themes/frontend-routes.generated.ts`
- `lib/i18n/theme-translations.generated.ts`
- `lib/themes/assets.generated.ts`
- `public/.generated/core-assets/*`
- `public/.generated/theme-assets/*`
