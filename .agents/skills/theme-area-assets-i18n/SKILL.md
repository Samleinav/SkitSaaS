---
name: theme-area-assets-i18n
description: Add or modify tokens, CSS assets, and i18n translations inside a theme pack. Use this skill when editing tokens.css, global.css, config.ts assets map, or theme-local locale files for admin/dashboard/frontend areas.
---

# theme-area-assets-i18n

## Scope

`tokens.css`, `global.css`, `config.ts` assets configuration, and `locales/<area>/<locale>.json` flat translations inside `themes/<themeId>/`.

## Required References

- `docs/themes/01-theme-runtime.md` — area resolution, active theme output, generated files
- `docs/themes/02-theme-authoring-guide.md` — pack structure, config.ts contract, locale file format
- `docs/reference/04-i18n-runtime.md` — host i18n runtime, flat natural-key format

## Assets Map (config.ts)

```ts
// themes/<themeId>/config.ts
export const themeConfig = {
  themeId: 'theme.<name>.<area>',
  assets: {
    tokens: './tokens.css',
    global: './global.css',       // optional
    favicon: './assets/favicon.ico'  // optional
  }
};
```

Only reference files that exist in the theme directory.

## tokens.css

Design token overrides (CSS custom properties):

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

Tokens must match the host's CSS variable contract. Do not add tokens that have no corresponding host reference.

## i18n Locale Files

Flat natural-key format per area and locale:

```
themes/<themeId>/locales/
  admin/
    en.json
    es.json
  dashboard/
    en.json
  frontend/
    en.json
```

Locale file format:

```json
{
  "Dashboard": "Panel",
  "Settings": "Configuración",
  "Save changes": "Guardar cambios"
}
```

Rules:
- Single-level object only (`English key → translated value`).
- Conflicting `locale + key` values across themes fail `pnpm i18n:prepare`.
- Keys must match what the host templates actually reference — do not add orphan keys.

## Build Pipeline

```bash
pnpm themes:prepare     # picks up config.ts asset map
pnpm i18n:prepare       # merges theme locale files into host bundles
```

Run both after any change to tokens, assets, or locales.

## Verification

```bash
pnpm themes:prepare && pnpm i18n:prepare   # both must succeed
pnpm exec tsc --noEmit
```

Check that theme locale keys do not conflict with other enabled themes.
