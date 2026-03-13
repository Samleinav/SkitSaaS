---
title: SDK vs source-host — Form capabilities
description: Reference table of what is and is not available in SDK BuildForm vs host BuildForm for source-host modules.
sidebar_position: 3
---

# SDK vs source-host — Form capabilities

This table is a quick reference for module development. This project uses **source-host modules exclusively**, so the "source-host" column is the active path.

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

The SDK `BuildForm` is only relevant if a module is ever packaged as `source-package` (compiled outside the host). That is not the current strategy for this project.
