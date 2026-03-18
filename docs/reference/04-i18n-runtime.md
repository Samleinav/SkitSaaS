---
title: I18n Runtime
sidebar_position: 9
description: How the shared i18n runtime exposes typed host trees and the flat natural-key translator for host, modules, and themes.
---

# I18n Runtime

The runtime now has one locale source with two access styles:

- typed area messages for stable structured UI trees
- flat natural-key translation for ad-hoc copy, modules, and themes

Both are generated from the same locale sources through `pnpm i18n:prepare`.

## Typed area messages

Use typed area messages when the UI already has a stable shape and you want
compile-time access to nested keys.

Examples:

- page headings and descriptions
- form labels and placeholders
- table labels and section copy
- reusable layout/navigation copy

API:

```ts
const messages = useAreaMessages('dashboard');
const title = messages.team.subscription.title;
```

On the server:

```ts
const messages = await getServerMessages('admin');
```

## Flat natural-key translator

Use the flat translator for copy that is ad-hoc, local to one code path, or
awkward to model as a nested tree.

Examples:

- toast/notify messages
- server action error strings
- formatting helpers that interpolate short phrases
- module flat translation files under `i18n/translations/*.json`

API:

```ts
const t = useI18n();
notify.warning(t('You must be a team owner to invite new members.'));
```

Module-local scope:

```ts
const t = useI18n({ moduleId: 'mod.analytics' });
```

On the server:

```ts
const t = await getServerTranslator();
return { error: t('Invalid email or password. Please try again.') };
```

Inside server actions, prefer `getActionTranslator()` so locale resolution does
not depend on `connection()`:

```ts
const t = await getActionTranslator();
```

## Decision rule

Use typed messages when:

- the copy belongs to a known UI structure
- the same tree is reused across multiple components
- you want TypeScript to guard access paths

Use the flat translator when:

- the string is local to one branch or side effect
- the copy is not worth expanding the public typed contract
- the path is already driven by a plain string, such as `notify(...)`

Do not mass-migrate existing typed trees to flat keys. The typed host trees
still exist for stable layouts, but themes and modules should default to the
flat translator.

## Source of truth

Core flat keys are derived from `lib/i18n/locales/<locale>/*.ts`. If a string
does not exist in those locale bundles, the translator falls back to the
original English key.

Supported locales for the language switcher are no longer limited to the core
locale folders. `pnpm i18n:prepare` now publishes the union of:

- core locales found under `lib/i18n/locales/*`
- theme `additionalLocales` declared in `themes/<themeId>/config.ts`
- module `additionalLocales` declared in `ModuleManifest`
- module flat translation locale filenames under `i18n/translations/*.json`

If a supported locale does not have a typed core bundle, `useAreaMessages(...)`
falls back to the default locale (`en`) while flat translators still resolve
any available theme/module overrides for that locale.

For modules, flat keys come from:

- `modules/<moduleId>/i18n/translations/<locale>.json`
- `modules/<moduleId>/dist/i18n/translations/<locale>.json`

For themes, flat keys come from:

- `themes/<themeId>/locales/<area>/<locale>.json`

Theme translations are merged on top of the core flat registry for the active
`themeId + area`. `global` applies first, then the requested area overrides it.

Module flat translations are also generated into a module-scoped registry, so
`useI18n({ moduleId })` can resolve that module's locale bucket before it falls
back to the shared flat registry.

If two sources define the same `locale + key` with different values,
`pnpm i18n:prepare` fails.

## Current pilot usage

Current core pilots:

- login server action errors in `app/(login)/actions.ts`
- dashboard invite warning notification in `app/(dashboard)/dashboard/home-core.tsx`
- relative-time helper in `lib/i18n/formatting.ts`

Theme usage:

- theme components use `useI18n({ themeId, area })` from `@skitsaas/sdk`
- `components/theme/theme-i18n-host.tsx` injects the core flat registry plus
  `lib/i18n/theme-translations.generated.ts`
