---
name: core-ui-systems
description: Modify or extend the host's FormBuilder system, DataTable system, shared UI components, or i18n runtime. Use this skill when changing FormBuilder field types, CTC template contracts, host datatable rendering, or the host i18n message pipeline.
---

# core-ui-systems

## Scope

Host-side FormBuilder (registry, renderer, validation adapter), DataTable system, shared UI components, and i18n runtime. Theme-pack authoring is out of scope — see `theme-*` skills.

## Required References

- `docs/forms/01-form-build-system.md` — FormBuilder architecture, field types, validation layers, registry pattern
- `docs/datatables/01-build-table-system.md` — host datatable build system
- `docs/datatables/02-sdk-datatables-crud.md` — SDK CRUD router
- `docs/reference/04-i18n-runtime.md` — host i18n runtime, `getServerMessages`, `useAreaMessages`

## Key Files

| File | Purpose |
|------|---------|
| `app/sdk/src/forms.ts` | FormBuilder type definitions (SDK) |
| `app/sdk/src/ui/build-form.tsx` | Public SDK BuildForm renderer + fallback path |
| `app/sdk/src/ui/template-build-form.tsx` | Public SDK server wrapper for host `ui.form` payload resolution |
| `components/ui/build-form.tsx` | Host renderer implementation targeted by the SDK adapter |
| `components/ui/template-build-form.tsx` | Host server wrapper used by core routes |
| `components/ui/sdk-build-form-provider.tsx` | App-root bridge that delegates SDK `BuildForm` to the host renderer |
| `lib/modules/sdk-server-bootstrap.ts` | Server bootstrap that wires BuildForm DB validation + `ui.form` template resolution |
| `lib/forms/registry-catalog.ts` | Form metadata catalog |
| `lib/forms/registry.ts` | Form → server action mapping |
| `lib/forms/runtime.ts` | Field value/colSpan helpers |
| `lib/forms/db-registry.ts` | DB validation adapter |
| `lib/templates/catalog.ts` | CTC component IDs |
| `lib/i18n/server.ts` | `getServerMessages(area)` |

## FormBuilder — Host Pattern

Public module-facing FormBuilder stays SDK-first:

1. `BuildForm` and `TemplateBuildForm` remain imports from `@skitsaas/sdk`.
2. The host owns the adapter provider and template resolver that upgrade those
   SDK imports inside SkitSaaS.

Forms registered in Core must then use:

1. factory function in `app/(dashboard)/<area>/.../forms.ts`
2. import + entry in `lib/forms/registry-catalog.ts`
3. action import + entry in `lib/forms/registry.ts`
4. compose using `composeRegisteredBuildFormDefinition(formId, base, options)`

Module forms do NOT use the host registry — they use `composeBuildFormDefinition` from `@skitsaas/sdk` directly.

## Adding a New Field Type to FormBuilder

1. Add type definition to `app/sdk/src/forms.ts`.
2. Add renderer case to `app/sdk/src/ui/build-form.tsx`.
3. Add matching host-renderer support to `components/ui/build-form.tsx` when
   parity inside SkitSaaS should include the richer host path.
4. Add normalization handling to `lib/forms/runtime.ts` if needed.
5. Update `docs/forms/01-form-build-system.md`.
6. Rebuild SDK: `pnpm build` in `app/sdk/`, then `pnpm install` from root.

## i18n Runtime

```ts
// Server component
import { getServerMessages } from '@/lib/i18n/server';
const messages = await getServerMessages('admin'); // or 'dashboard'

// Client component
import { useAreaMessages } from '@/lib/i18n/client';
const messages = useAreaMessages('admin');
```

Message types: `lib/i18n/messages/admin.ts`, `lib/i18n/messages/dashboard.ts`.

After adding new message keys, add corresponding types.

## CTC Contract Changes

Adding a new `componentId` to the CTC catalog requires:
1. Add to `TEMPLATE_COMPONENT_IDS` in `lib/templates/catalog.ts`.
2. Define slot data type in `lib/templates/ui-<name>-payload.ts`.
3. Create default renderer in `components/ui/template-<name>.tsx`.
4. Update `docs/themes/03-template-controller.md`.

This is a breaking change for theme packs — notify theme authors.

## SDK Rebuild Reminder

After any change to `app/sdk/src/`:

```bash
cd app/sdk && pnpm build
cd ../.. && pnpm install   # refresh pnpm cached copy
```
