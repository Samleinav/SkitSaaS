---
title: "I18n Runtime"
sidebar_position: 0
---

# I18n Runtime

Use this page when the task depends on how copy is resolved across host, theme,
and module code.

## Runtime Model

The runtime exposes one locale source through two access styles:

- typed area messages for legacy structured host trees
- flat natural-key translation for new host, theme, and module work

Both are prepared through `pnpm i18n:prepare`.

## Official Status

Current preferred path:

- `useI18n()` for client code
- `getServerTranslator()` for server code
- `getActionTranslator()` for server actions

Compatibility path:

- `useAreaMessages()`
- `getServerMessages()`

Those compatibility helpers still exist, but new runtime code should not depend
on them by default.

## Flat Translator

Use the flat translator when the copy is:

- local to one code path
- side-effect-oriented
- module-owned
- theme-owned
- awkward to model as a nested tree

Typical examples:

- toast copy
- server action errors
- module translation files under `i18n/translations/*.json`
- theme locale overrides under `locales/<area>/<locale>.json`

## Typed Compatibility Trees

Use typed area messages only when a legacy host surface still depends on the
existing structured tree.

Typical examples:

- older layout/navigation trees
- legacy page heading trees
- compatibility-heavy host surfaces not yet migrated

## Current Priority Order

For `useI18n()` and server translators, the effective priority is:

1. explicit `translationsByLocale`
2. active theme override for the requested area
3. active theme `global` override
4. module-scoped flat translations for `moduleId`
5. shared/core flat translations
6. the same order in `defaultLocale`
7. raw key

## Current Hook And Server APIs

Client:

```ts
const t = useI18n({ area: 'dashboard' });
const title = t('Team Subscription');
```

Module-scoped client:

```ts
const t = useI18n({ moduleId: 'mod.analytics' });
```

Server:

```ts
const t = await getServerTranslator({ area: 'admin' });
```

Server action:

```ts
const t = await getActionTranslator({ moduleId: 'mod.analytics' });
```

## Source Of Truth

Core flat keys come from:

- `lib/i18n/locales/<locale>/*`

Theme flat keys come from:

- `themes/<themeId>/locales/<area>/<locale>.json`

Module flat keys come from:

- `modules/<moduleId>/i18n/translations/<locale>.json`
- `modules/<moduleId>/dist/i18n/translations/<locale>.json`

## Locale Publication

Supported locales can come from:

- core locale folders
- theme `additionalLocales`
- module `additionalLocales`
- module flat translation filenames

The prepare step publishes the union of those sources.

## Collision Policy

If two sources define the same `locale + key` with different values,
`pnpm i18n:prepare` fails.

That is a release-blocking collision, not a warning-level issue.

## Decision Rule

Use typed messages when:

- the copy belongs to a stable reused UI tree
- TypeScript path safety is valuable there

Use the flat translator when:

- the string is local
- the string belongs to a module or theme
- the code path is already driven by plain string keys

## Practical Rule

For new code:

- host can still keep some typed compatibility surfaces
- themes should default to flat translator usage
- modules should default to flat translation files and SDK translator APIs

## Related Docs

- `./env-and-runtime-config.md`
- `../modules-development/data-config-and-i18n.md`
- `../theme-development/backoffice-assets-and-locales.md`
