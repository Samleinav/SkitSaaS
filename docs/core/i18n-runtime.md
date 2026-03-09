---
title: I18n Runtime
sidebar_position: 9
description: How typed area messages and the flat natural-key translator work together in the host runtime.
---

# I18n Runtime

The host now supports two i18n systems in parallel:

- typed area messages for stable structured UI trees
- flat natural-key translation for ad-hoc copy

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

Do not mass-migrate existing typed trees to flat keys. Flat translation is an
addition, not a replacement.

## Source of truth

Core flat keys are derived from `lib/i18n/locales/<locale>/*.ts`. If a string
does not exist in those locale bundles, the translator falls back to the
original English key.

For modules, flat keys come from:

- `modules/<moduleId>/i18n/translations/<locale>.json`
- `modules/<moduleId>/dist/i18n/translations/<locale>.json`

If two sources define the same `locale + key` with different values,
`pnpm i18n:prepare` fails.

## Current pilot usage

Current core pilots:

- login server action errors in `app/(login)/actions.ts`
- dashboard invite warning notification in `app/(dashboard)/dashboard/home-core.tsx`
- relative-time helper in `lib/i18n/formatting.ts`
