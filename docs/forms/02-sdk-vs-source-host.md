---
title: SDK vs source-host — Form capabilities
description: Reference table of what is and is not available in SDK BuildForm vs host BuildForm for source-host modules.
sidebar_position: 3
---

# SDK vs source-host — Form capabilities

This table is a quick reference for module development.

Today, the repository still favors `source-host` when a module needs exact host parity, but the SDK renderer is already real and portable. That means the correct long-term direction is not "SDK imports core when it can", but "SDK is self-sufficient and the host optionally registers richer UI hooks at runtime".

## Renderer

| Capability | SDK `BuildForm` | source-host `BuildForm` |
|---|---|---|
| Import path | `@skitsaas/sdk` | `@/components/ui/build-form` |
| Requires `@/` aliases | No | Yes |
| shadcn components (`Input`, `Button`, `Label`) | No — plain HTML + CSS vars | Yes |
| CTC payload (`ui.form` class overrides) | No | Yes |
| `ThemedAsyncSubmitButton` | No — plain `<button>` | Yes |
| `successLabel` on submit | No | Yes |
| `submit.confirm` (confirm modal before submit) | No | Yes |
| `BuildModal` confirm/delete flow | No | Yes |

## Form contract (same in both)

| Capability | SDK `BuildForm` | source-host `BuildForm` |
|---|---|---|
| `defineBuildForm`, `buildFormField.*` | Yes | Yes |
| `withBuildFormValues` prefill | Yes | Yes |
| `withBuildFormValidation` | Yes | Yes |
| All field types: `text`, `email`, `password`, `tel`, `url`, `date`, `number`, `textarea`, `select`, `checkbox`, `hidden` | Yes | Yes |
| `repeater` field (dynamic rows) | Yes | Yes |
| `dynamicOptions` / `optionsKey` | Yes | Yes |
| `disableWhen` on fields and sub-fields | Yes | Yes |
| `mask` (`digits`, `decimal`, `currency`, `phone`, `slug`, `upper`, `lower`) | Yes | Yes |
| `colSpan`, responsive grid | Yes | Yes |
| Sections with `title` / `description` | Yes | Yes |
| Blur / change local validation | Yes | Yes |
| Preflight AJAX to `/api/forms/validate` | Yes | Yes |
| Server validation hydration via `useActionState` | Yes | Yes |
| `useFormStatus` pending state | Yes | Yes |
| No-JS `<noscript>` submit fallback | Yes | Yes |

## Validation helpers (always from SDK)

Validation helpers always come from `@skitsaas/sdk` regardless of which renderer is used.

```ts
import {
  defineBuildForm,
  buildFormField,
  withBuildFormValues,
  withBuildFormValidation,
  defineValidatedBuildForm,
  composeBuildFormDefinition,
  buildFormValidationPreset,
} from '@skitsaas/sdk';
```

## Which renderer to use in this project

```tsx
// definition — always from SDK
import { defineBuildForm, buildFormField } from '@skitsaas/sdk';

// renderer — host (source-host modules have full access to @/)
import { BuildForm } from '@/components/ui/build-form';
// or with CTC:
import { TemplateBuildForm } from '@/components/ui/template-build-form';
```

The SDK `BuildForm` is the safe default for `source-package` and other host-free contexts.
The host renderer stays the right path when a module is `source-host` and wants full parity with core UI.

## Runtime bridge available now

The SDK now has two bridge points:

```tsx
import { BuildForm, TemplateBuildForm } from '@skitsaas/sdk';

// client renderer: fallback by default, host-delegated inside SkitSaaS
<BuildForm definition={form} area="frontend" />

// server wrapper: resolves host `ui.form` payloads when available
<TemplateBuildForm definition={form} area="frontend" />
```

Inside SkitSaaS, the app root now installs a host adapter provider for `BuildForm`, and the server bootstrap installs a resolver for `TemplateBuildForm`.

Current behavior:

- SDK owns the authoring contract and a working fallback renderer.
- Host code can explicitly replace the renderer with `templateRenderer`.
- Host code can also provide a default runtime adapter for all SDK `BuildForm` instances.
- `TemplateBuildForm` can resolve `ui.form` payload metadata from the host without module-side `@/` imports.
- `source-package` modules still do not import host UI directly.

## What this means in practice

If a module uses only SDK imports:

- outside SkitSaaS, `BuildForm` still renders with the SDK fallback
- inside SkitSaaS, `BuildForm` can delegate to the host renderer and gain async submit + confirm modal behavior
- inside SkitSaaS, `TemplateBuildForm` can also receive host `ui.form` payloads for CTC-driven class overrides

For full host parity from SDK-only module code, prefer `TemplateBuildForm` in server-rendered pages.

## What the runtime adapter should own

Assuming Tailwind is always present, the SDK can keep the base field rendering and validation lifecycle, while the host only overrides the richer UI pieces:

- submit button rendering (`AsyncSubmitButton` / success state)
- confirm modal rendering (`BuildModal` / alert-dialog behavior)
- form skin payload (host maps `ui.form` CTC into a portable class/payload contract)

That keeps the portable renderer simple and avoids duplicating all form logic in two places.

## What not to do

Do not make the SDK "consult the core during build" or import host internals conditionally.

Why:

- `source-package` must build outside the host.
- build-time host detection creates unstable packaging rules
- conditional `@/` imports break the independence goal
- CTC remains a host concern and should be exposed through a contract, not through direct host imports

## Contract shape implemented

Current contract shape:

```ts
type BuildFormUiAdapter = {
  renderBuildForm?: (props: SdkBuildFormProps) => React.ReactNode;
};

type BuildFormUiTemplateResolverContext = {
  area: string;
  route?: string | null;
  themeId?: string | null;
  moduleId?: string | null;
  data?: unknown;
};

type BuildFormUiTemplateResolution = {
  templateId?: string | null;
  templateSource?: string | null;
  templateComponentId?: string | null;
  templatePayload?: SdkBuildFormTemplatePayload | null;
};
```

Effective flow:

1. A `source-package` module imports only `@skitsaas/sdk`.
2. The SDK renderer works on its own by default.
3. Inside SkitSaaS, the root layout provides a host render adapter for `BuildForm`.
4. Inside SkitSaaS, the server bootstrap provides a template resolver for `TemplateBuildForm`.
5. The same form definition can use host submit/modal/skin hooks automatically.

This preserves source-package independence without giving up host polish.

## Practical recommendation

For this project, the clean split is:

- keep `BuildFormDefinition`, validation, field rendering, and fallback submit flow inside the SDK
- keep CTC resolution, themed submit button behavior, and confirm modal implementation in the host
- connect both through an optional runtime adapter owned by the SDK contract

That is the safest way to support both `source-host` and future `source-package` modules without teaching the SDK to depend on the core.
