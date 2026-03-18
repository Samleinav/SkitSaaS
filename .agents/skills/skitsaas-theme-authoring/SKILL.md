---
name: skitsaas-theme-authoring
description: Create and evolve theme packs for SkitSaaS (admin, dashboard, and frontend) compatible with the CTC runtime and the theme build-time flow. Use this skill when asked to create a new theme, migrate external templates (Tailwind/shadcn/Bootstrap), complete missing templates by inventing components when needed, organize module templates under /templates/mods/module-id, or validate that themes:prepare and theme tests pass.
---

# SkitSaaS Theme Authoring

## Goal

Create and maintain themes for SkitSaaS with focus on:

- compatibility with `pnpm themes:prepare`
- CTC contract compliance (`ThemeTemplate`/`ThemeCodeTemplate`)
- full `admin/dashboard` coverage, even when components must be invented
- module extensibility
- strict theme work isolation (no Core changes without confirmation)

## Required References Before Editing

Read these files first:

- `AGENTS.md`
- `docs/modules/08-themes.md`
- `docs/modules/16-theme-authoring-guide.md`
- `docs/modules/14-template-controller.md`
- `lib/themes/manifest.ts`
- `lib/themes/required-code-templates.ts`
- `scripts/themes-prepare.ts`
- current base theme: `themes/first-backoffice/*` and/or `themes/first-frontend/*`

## Critical Rule: Theme vs Core Isolation

When creating/evolving a theme:

- Everything must be solved from the theme being worked on.
- Do not modify Core to "make a theme template/component work".
- Treat any file outside `themes/<theme-folder>/*` as Core (for example `app/*`, `components/*`, `lib/*`, `scripts/*`, `tests/*`, host docs, etc.).
- Allowed exception: generated artifacts from official commands (`pnpm themes:prepare`) when the flow regenerates them.

If something cannot be solved from the theme:

- stop any Core-change implementation
- prepare concrete options and ask the user/person for confirmation before touching Core
- do not assume implicit authorization

If a potential Core improvement is identified (to fix current issues or improve future theme authoring):

- propose the improvement and its impact
- ask for explicit confirmation before editing Core
- apply Core changes only after approval

## Recommended Flow

### 1. Define theme scope

Decide target area:

- `frontend`
- `admin`
- `dashboard`
- combined (`admin` + `dashboard`)

For backoffice (`admin/dashboard`), assume from the start that some components will be missing and must be created.

Define build-time selection:

- `THEME_ADMIN` for `admin` area
- `THEME_DASHBOARD` for `dashboard` area
- `THEME_FRONTEND` for `frontend` area

### 2. Create minimal pack structure

Base path:

- `themes/<theme-folder>/`

Minimum files:

- `package.json`
- `theme.json`
- `tokens.css`
- `config.ts`
- `templates/` (for code templates)
- `templates.json` (if applicable)
- `routes.ts` (only for route-driven frontend themes)

Rules:

- use `defineThemeConfig` from `@skitsaas/sdk`
- do not import host internals with `@/lib/*` inside `themes/*`
- avoid ID/template-name collisions
- `theme.json` must follow contract: `themeId` in dot.case (`theme.x.y`), semver `version`, valid `areas` (`admin|dashboard|frontend|global`), `mode="tokens"`, `entryTokens`, `themeRange`
- if the theme targets `frontend`, include `routes.ts[x]` so `themes:prepare` does not fail

### 3. Missing component policy

If a required component does not exist, create it.

Visual stack priority:

1. Tailwind CSS + shadcn-style primitives (default)
2. mix host utilities and external template markup
3. Bootstrap only when it provides clear value (layout/forms/utilities)

If Bootstrap is used:

- scope it in the theme `global.css` under a root class namespace
- do not contaminate host global styles
- keep host CSS tokens (`--background`, `--foreground`, etc.) as the color source

### 4. Backoffice template contract

For `admin/dashboard`, satisfy required IDs from:

- `lib/themes/required-code-templates.ts`

Operational rule:

- if a template does not exist in the external source, invent it with a coherent visual fallback
- prioritize shell/layout/nav first, then core pages, then table/UI slots
- consider CTC resolution order (`THEME_TEMPLATE_PRIORITY`): default is `theme -> module`; do not rely on module templates to cover host required IDs
- do not break baseline `theme.first.backoffice`; `themes:prepare` requires full admin/dashboard coverage

### 5. Rule for module templates

If module-level templates exist, create this subdirectory:

- `templates/mods/<moduleId>/`

Example:

- `templates/mods/mod.example.suite/`

Important:

- the theme registry uses file name as `componentId` (without folder)
- avoid cross-module collisions using unique file names with module prefix
- recommended filename example: `mod.example.suite.section.dashboard.example.card.tsx`

### 6. Host visual integration

Keep compatibility with `data` props sent by host:

- do not remove expected contract keys (`title`, `description`, `slot`, etc.)
- use robust defaults when data is missing
- preserve `children`/slots for runtime and module content
- if the theme defines i18n, use `i18n/<locale>.json` or `i18n/<area>/<locale>.json` with valid JSON

### 7. Required validation

Always run:

```bash
pnpm themes:prepare
npx tsx --test tests/theme/theme-pack-manifest.test.ts
npx tsx --test tests/theme/themes-prepare.test.ts
npx tsx --test tests/theme/theme-route-smoke.test.ts
npx tsx --test tests/theme/theme-slot-data-contract.test.ts
npx tsx --test tests/theme/theme-pack-import-boundaries.test.ts
```

For large asset/runtime changes:

```bash
npx tsx --test tests/theme/theme-assets-runtime.test.ts
npx tsx --test tests/theme/theme-code-template.test.tsx
npx tsx --test tests/theme/theme-runtime.test.ts
```

## Completion criteria

Mark complete only if:

- `themes:prepare` passes without errors
- no prohibited imports (`@/*`) exist inside the theme pack
- required area IDs are covered
- styles do not break other areas
- theme docs are updated when contract/usage changes

## Implementation guardrails

- keep ASCII by default in new files
- do not delete or revert user changes outside requested scope
- do not copy an entire external app into the theme: extract only what is needed
- prioritize SkitSaaS consistency over pixel-perfect fidelity to source template
- modifying Core is forbidden without explicit user/person confirmation
- if no sufficient extension point exists in theme, escalate with a proposal and wait for approval before any change outside `themes/<theme-folder>/*`
