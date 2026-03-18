---
title: Theme Runtime
sidebar_position: 8
---

# Theme Runtime

Transition status (2026-02-14): build-time-only selection is active for host rendering.

Canonical target contract and migration decisions:

- [Theme Build-Time Only ADR](./04-theme-build-adr.md)

Theme runtime is powered by:

- ENV-selected themes prepared at build time (`THEME_ADMIN`, `THEME_DASHBOARD`, `THEME_FRONTEND`)
- `themes/*/theme.json` packs prepared into `lib/themes/external.generated.ts`
- `themes/*/config.ts[x]` for assets/metadata and `routes.ts[x]` for frontend route-driven dispatch
- `app_themes` and `user_theme_preferences` are now legacy tables (not used for normal host selection)

Main implementation:

- `lib/theme-runtime.ts`
- `components/theme/theme-runtime-provider.tsx`
- `lib/themes/manifest.ts`
- `scripts/themes-prepare.ts`
- `lib/themes/runtime.ts`

## Policy keys

Theme selection keys are build-time ENV values:

- `THEME_ADMIN`
- `THEME_DASHBOARD`
- `THEME_FRONTEND`

Runtime behavior keys:

- `THEME_MODE` (`system|light|dark`)
- `THEME_ALLOW_USER_OVERRIDE` (`true|false`)

## Area resolution and auth routes

Runtime resolves area by pathname:

- `/admin/*` -> `admin`
- `/dashboard/*` -> `dashboard`
- `/admin/login` -> `admin`
- `/login`, `/sign-in`, `/sign-up` -> `dashboard`
- other public routes (`/`, `/pricing`) -> `frontend`

This allows independent login theming:

- `/admin/login` uses admin theme selection
- `/login` uses dashboard theme selection

## Active themes

Active themes are resolved during `pnpm themes:prepare` from ENV and emitted to:

- `lib/themes/selection.generated.ts`

Runtime selection no longer reads active rows from `app_themes`.

Example frontend switch:

```bash
THEME_FRONTEND=theme.shadcn.dashboard.frontend pnpm themes:prepare
```

## External theme packs

Each pack lives under `themes/<pack-dir>/`, and `theme.json` declares the public `themeId`:

```json
{
  "themeId": "theme.corporate.frontend",
  "version": "1.0.0",
  "areas": ["frontend"],
  "mode": "tokens",
  "entryTokens": "tokens.css",
  "themeRange": "^1.0.0"
}
```

Current local frontend examples:

- `theme.first.frontend` -> `themes/first-frontend`
- `theme.frontend.sandbox` -> `themes/frontend-sandbox`
- `theme.shadcn.dashboard.frontend` -> `themes/shadcn-dashboard-frontend`
  - inspired by `templateShadcn/shadcn-dashboard/nextjs-version`
  - provides route templates for `/`, `/pricing`, `/404`, and `/__layout`
  - includes `config.ts` assets (`global.css`, `favicon`, area not-found template)

Current local backoffice examples:

- `theme.first.backoffice` -> `themes/first-backoffice`
- `theme.nexus` -> `themes/nexustheme`
  - both cover `admin` and `dashboard`
  - both expose private-area controls through `ui.user-menu`
  - both now mount a persisted notification center from that slot

Prepare registry:

```bash
pnpm themes:prepare
```

Generated output:

- `lib/themes/external.generated.ts`
- `lib/themes/selection.generated.ts`
- `lib/themes/code-registry.generated.ts`
- `lib/themes/frontend-routes.generated.ts`
- `lib/themes/assets.generated.ts`
- `public/.generated/core-assets/*`
- `public/.generated/theme-assets/*`

## Theme config contract

Theme packs must stay host-agnostic.

Build-time-only target uses:

- `config.ts` as canonical config entry
- `routes.ts` for frontend route-driven themes

Import helpers only from the SDK package, not from root aliases such as `@/lib/*`.

```ts
import { defineThemeConfig } from '@skitsaas/sdk';

export default defineThemeConfig({
  head: {
    fonts: ['https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap']
  }
});
```

## Theme I18n

Themes now use the same flat natural-key translator style as the host runtime:

```ts
t('Cancel') // => 'Cancelar'
```

Theme translations are area-scoped overrides on top of the core flat registry.
That means theme code can use one API and still inherit core translations for
keys the theme does not redefine.

### File structure

Add flat translation files in your theme directory:

```text
themes/<pack-dir>/locales/<area>/<locale>.json
```

Supported areas:

- `global`
- `frontend`
- `admin`
- `dashboard`
- `login`

`global` is optional and is merged before the selected area.

Example (`themes/pilot-admin/locales/admin/en.json`):

```json
{
  "Admin table": "Admin table",
  "No data available": "No data available"
}
```

Example (`themes/pilot-admin/locales/admin/es.json`):

```json
{
  "Admin table": "Tabla admin",
  "No data available": "No hay datos disponibles"
}
```

Rules:

- files must be flat JSON objects of `English key -> translated value`
- nested objects are invalid for theme translations
- theme translations override core flat keys for the matching `themeId + area`
- if a key is not provided by the theme, `useI18n(...)` falls back to the core
  host translation
- if you want the locale to appear in the global language switcher even when
  the core does not ship `lib/i18n/locales/<locale>/*`, declare it in
  `config.ts` with `additionalLocales`

Example:

```ts
import { defineThemeConfig } from '@skitsaas/sdk';

export default defineThemeConfig({
  additionalLocales: ['fr']
});
```

### Build step

The registry is built automatically by `themes:prepare`:

```bash
pnpm themes:prepare
```

This generates:

- `lib/i18n/theme-translations.generated.ts`

The host injects this registry together with the core flat registry through the
SDK `I18nProvider`.

### Usage in theme components

Theme components should use `useI18n({ themeId, area })` from the SDK. The
`themeId` prop is automatically injected by `ThemeTemplate` / `ThemeCodeTemplate`.

```tsx
import { useI18n } from '@skitsaas/sdk';

export default function MyThemeComponent({
  themeId
}: {
  themeId?: string;
}) {
  const t = useI18n({ themeId, area: 'admin' });

  return <div>{t('Cancel')}</div>;
}
```

## Frontend module slots in themes/pages

Frontend themes/pages should integrate module content through slots instead of direct imports.
Use the host helper to render slot content with fallback:

```tsx
import { FrontendModuleSlot } from '@/components/ui/frontend-module-slot';

export default async function ContactPage() {
  return (
    <FrontendModuleSlot
      slotId="frontend.contact.form.primary"
      moduleId="mod.contact.us"
      route="/contact-us"
      fallback={<DefaultContactForm />}
    />
  );
}
```

This keeps theme and module decoupled:

- theme controls layout/placement
- module controls slot implementation
- host/runtime resolves active provider with fallback safety

## Runtime token/assets loading

Area assets are prepared at build-time and loaded per area on SSR:

- `app/(frontend)/layout.tsx` (area `frontend`)
- `app/(dashboard)/admin/layout.tsx` (area `admin`)
- `app/(dashboard)/dashboard/layout.tsx` (area `dashboard`)
- `app/(login)/login/page.tsx` and `app/(login)/sign-up/page.tsx` (area `dashboard`)
- `app/(login)/admin/login/page.tsx` (area `admin`)

Runtime area asset renderer:

- `components/theme/theme-area-assets.tsx`

Generated registries and outputs:

- `lib/themes/assets.generated.ts`
- `public/.generated/core-assets/*`
- `public/.generated/theme-assets/*`

If a selected pack is missing or invalid for an area, runtime falls back immediately to core styles (no crash).

## Theme assets by area (`config.ts`)

Preferred source (build-time model): `ThemeConfig.assets` in `config.ts`.

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
      frontend: 'assets/favicon-frontend.svg'
    },
    notFoundTemplateByArea: {
      frontend: 'system.not-found'
    }
  }
});
```

Host integration resolves assets from `ThemeConfig.assets` (`config.ts`).

Runtime resolver:

- `lib/themes/assets.ts`

Current host integration:

- `generateMetadata()` in:
  - `app/(frontend)/layout.tsx`
  - `app/(dashboard)/admin/layout.tsx`
  - `app/(dashboard)/dashboard/layout.tsx`
  - `app/(login)/login/page.tsx`
  - `app/(login)/admin/login/page.tsx`
  - `app/(login)/sign-up/page.tsx`
- area CSS/JS bundle injection with `components/theme/theme-area-assets.tsx`
- area not-found dispatchers:
  - `app/(frontend)/not-found.tsx`
  - `app/(dashboard)/admin/not-found.tsx`
  - `app/(dashboard)/dashboard/not-found.tsx`

Safety behavior:

- missing/invalid asset config fields are ignored
- unsafe paths outside the theme pack root are rejected
- all surfaces keep core fallback behavior
- when `ignoreCoreCssByArea[area]=true`, the theme becomes responsible for area CSS compatibility

## DB theme catalog (legacy)

`app_themes` is kept for compatibility/audit only.

- Host rendering does not use `app_themes` active/default rows.
- Theme selection must be changed through ENV + rebuild.

## User override

If `THEME_ALLOW_USER_OVERRIDE=true`, user mode override is handled client-side through `localStorage` (`THEME_STORAGE_KEY`).

- No runtime persistence is written to `user_theme_preferences`.
- Overrides affect mode (`light`/`dark`), not area theme selection.

## Rollback runbook

If a deployed pack causes visual/runtime issues:

1. Set safe ENV values (`THEME_ADMIN`, `THEME_DASHBOARD`, `THEME_FRONTEND`) to known-good themes.
2. Re-run registry generation and rebuild:
   - `pnpm themes:prepare`
   - `pnpm build`
3. Redeploy.
4. Validate affected routes:
   - `/`
   - `/pricing`
   - `/login`
   - `/admin/login`
   - `/dashboard`
   - `/admin`

## Testing

- `tests/theme/theme-runtime.test.ts`
- `tests/theme/theme-pack-manifest.test.ts`
- `tests/theme/themes-prepare.test.ts`
- `tests/theme/theme-pack-runtime.test.ts`
- `tests/theme/theme-area-runtime.integration.test.ts`
- `tests/theme/theme-assets-runtime.test.ts`
- `tests/theme/theme-code-template.test.tsx`
- `tests/theme/theme-route-smoke.test.ts`

For authoring workflow and pack conventions, see:

- `docs/themes/02-theme-authoring-guide.md`
