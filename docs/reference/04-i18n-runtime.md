---
title: I18n Runtime
sidebar_position: 9
description: How the shared i18n runtime exposes typed host trees and the flat natural-key translator for host, modules, and themes.
---

# I18n Runtime

The runtime currently exposes one locale source with two access styles:

- typed area messages for stable structured UI trees
- flat natural-key translation for ad-hoc copy, modules, and themes

Both are generated from the same locale sources through `pnpm i18n:prepare`.

## Official status

- `useI18n()` is the default runtime API for new host, theme, and module code.
- Official themes and module-facing UI should use `useI18n()`.
- `useAreaMessages()` / `getServerMessages()` remain as a deprecated
  compatibility surface for older typed host trees while the host finishes its
  gradual migration. That compatibility layer now starts from the default typed
  tree and translates its string leaves through the flat runtime for the
  requested area.
- Active host runtime call sites now use `useI18n()` / `getServerTranslator()`;
  the deprecated helpers remain exported only for typed compatibility.

## Deprecated typed compatibility helpers

Use typed area messages only when a legacy surface still needs the existing
structured tree and a full local migration would be noisy.

Examples:

- page headings and descriptions
- form labels and placeholders
- table labels and section copy
- reusable layout/navigation copy

Client compatibility helper:

```ts
const messages = useAreaMessages('dashboard');
const title = messages.team.subscription.title;
```

Server compatibility helper:

```ts
const messages = await getServerMessages('admin');
```

Preferred replacements:

```ts
const t = useI18n({ area: 'dashboard' });
const title = t('Team Subscription');
```

```ts
const [locale, t] = await Promise.all([
  getRequestLocale(),
  getServerTranslator({ area: 'admin' })
]);
```

If a typed tree is still unavoidable, build it from the translator instead of
using the legacy server helper directly:

```ts
const t = await getServerTranslator({ area: 'admin' });
const messages = getAreaMessagesFromTranslator('admin', t);
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

For module pages and server actions, the same runtime is available through the
SDK server entrypoint:

```ts
import { getActionTranslator, getServerTranslator } from '@skitsaas/sdk/server';

const t = await getServerTranslator({ moduleId: 'mod.analytics' });
const actionT = await getActionTranslator({ moduleId: 'mod.analytics' });
```

Inside server actions, prefer `getActionTranslator()` so locale resolution does
not depend on `connection()`:

```ts
const t = await getActionTranslator();
```

## Current published `useI18n()` contract

Today the published runtime contract is:

```ts
const t = useI18n({
  area: 'admin',
  themeId: 'theme.nexus',
  moduleId: 'mod.analytics',
  translationsByLocale: {
    fr: {
      Cancel: 'Annuler'
    }
  }
});
```

Supported options:

- `area`
- `themeId`
- `moduleId`
- `translationsByLocale`

There is no published `packId`, `namespace`, or first-class language-pack
selector in the runtime contract yet.

## Decision rule

Use typed messages when:

- the copy belongs to a known UI structure
- the same tree is reused across multiple components
- you want TypeScript to guard access paths

Use the flat translator when:

- the string is local to one branch or side effect
- the copy is not worth expanding the public typed contract
- the path is already driven by a plain string, such as `notify(...)`

Do not mass-migrate existing typed trees to flat keys blindly. The typed host
trees still exist for stable layouts, but themes, modules, and new host copy
should default to the flat translator, and no new runtime code should add fresh
`useAreaMessages()` / `getServerMessages()` dependencies.

## Current runtime priority

The current winning priority for `useI18n()` is:

1. explicit `translationsByLocale` passed to the hook or translator
2. active theme override for the requested `area`
3. active theme `global` override
4. module-scoped flat translations for `moduleId`
5. shared/core flat translations
6. the same order in `defaultLocale`
7. raw key

This is the published runtime behavior today. Modules can now declare
`ModuleManifest.languagePack.scopes` as explicit provider metadata, but the
host-side `host-*` scopes are still future loader work and are not part of the
current resolver contract.

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

When available, `i18n:prepare` now reads theme/module locale publication
metadata from generated build artifacts instead of re-importing source
`config.ts` or module manifests directly:

- `lib/themes/external.generated.ts`
- `lib/modules/external-meta.generated.ts`

If a supported locale does not have a typed core bundle, `useAreaMessages(...)`
and `getServerMessages(...)` keep the default typed shape from `en`, but the
actual leaf strings are now translated through the current area translator.
That lets legacy typed consumers benefit from the same flat fallback behavior
used by `useI18n()`.

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

Themes and modules can therefore publish locales and flat overrides today. For
modules, `languagePack.scopes` now makes provider intent explicit in generated
metadata, while host/core `host-*` pack loading remains future work.

If two sources define the same `locale + key` with different values,
`pnpm i18n:prepare` fails.

## Current pilot usage

Current core pilots:

- login server action errors in `app/(login)/actions.ts`
- dashboard invite warning notification in `app/(dashboard)/dashboard/home-core.tsx`
- relative-time helper in `lib/i18n/formatting.ts`
- module server pages can now use `getServerTranslator({ moduleId })` from `@skitsaas/sdk/server`

Theme usage:

- theme components use `useI18n({ themeId, area })` from `@skitsaas/sdk`
- `components/theme/theme-i18n-host.tsx` injects the core flat registry plus
  `lib/i18n/theme-translations.generated.ts`
