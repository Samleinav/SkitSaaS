---
name: theme-pack-foundation
description: Bootstrap and configure a new theme pack for SkitSaaS. Use this skill when creating a new theme, registering it with the host runtime, or configuring build-time theme selection via ENV.
---

# theme-pack-foundation

## Scope

Theme pack directory structure, `theme.json`, `config.ts`, ENV selection, and the `themes:prepare` pipeline.

## Required References

- `docs/themes/01-theme-runtime.md` — build-time-only selection, ENV keys, area resolution, active theme output
- `docs/themes/04-theme-build-adr.md` — canonical ADR for build-time-only model
- `docs/reference/03-env-variables.md` — `THEME_ADMIN`, `THEME_DASHBOARD`, `THEME_FRONTEND`

## Theme Boundary Rules

Work inside `themes/<themeId>/` only. If the request requires changing:
- shared host rendering contracts (CTC component slots, `ThemeTemplate` types) → escalate to `core-ui-systems`
- module dispatcher or module route behavior → escalate to `core-routing-runtime`

## Minimal Structure

```
themes/<themeId>/
  package.json
  theme.json
  config.ts
  routes.ts          (frontend themes only)
  tokens.css
  global.css         (optional)
  locales/
    admin/en.json
    dashboard/en.json
  templates/         (optional code-driven CTC templates)
  assets/
```

## theme.json

```json
{
  "themeId": "theme.<name>.<area>",
  "version": "1.0.0",
  "areas": ["admin"],
  "mode": "tokens",
  "entryTokens": "tokens.css",
  "entryTemplates": "templates.json",
  "themeRange": "^1.0.0"
}
```

`areas` values: `"admin"` | `"dashboard"` | `"frontend"` (array, can include multiple).

## ENV Selection (Build-Time Only)

```bash
THEME_ADMIN=theme.<name>.<area>
THEME_DASHBOARD=theme.<name>.<area>
THEME_FRONTEND=theme.<name>.<area>
```

Set in `.env.local` for dev. Set in deployment ENV for production.

## Build Pipeline

```bash
pnpm themes:prepare   # reads theme.json + config.ts, emits generated files
```

Generated output:
- `lib/themes/external.generated.ts`
- `lib/themes/selection.generated.ts`
- `lib/themes/code-registry.generated.ts`

Run `themes:prepare` after any `theme.json` or `config.ts` change.

## Verification

```bash
pnpm themes:prepare           # must complete without errors
pnpm exec tsc --noEmit        # no type errors
```

Check `lib/themes/selection.generated.ts` — active theme should appear under the correct area key.

## Next Steps

- Add tokens and styling → `theme-area-assets-i18n`
- Add CTC templates → `theme-ctc-authoring`
- Add frontend routes → `theme-frontend-routes`
