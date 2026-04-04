---
title: "Frontend Routing And Slots"
sidebar_position: 0
---

# Frontend Routing And Slots

Use this page when the task depends on module-owned frontend routes or when a
host/theme page embeds module UI through a slot instead of importing the module
directly.

## What This Enables

Current frontend module contract allows:

- modules to own frontend routes without editing core pages
- themes or host pages to embed module UI by `slotId`
- centralized host runtime control over auth policy, alias safety, and fallback
  behavior

## Manifest Contract

Relevant `ModuleManifest` fields:

- `frontendPage`
- `frontendRouteAliases`
- `frontendRouteAccess`
- `frontendNavItems`
- `frontendSlots`

Typical shape:

```ts
import { defineModule } from '@skitsaas/sdk';
import { createModulePageRouter } from '@skitsaas/sdk/server';

const frontendPage = createModulePageRouter({
  routes: [{ path: '/', handler: () => <div>Contact module home</div> }]
});

export default defineModule({
  moduleId: 'mod.contact.us',
  version: '1.0.0',
  displayName: 'Contact',
  frontendRouteAliases: ['/contact-us'],
  frontendRouteAccess: 'public',
  frontendPage,
  frontendSlots: [
    {
      slotId: 'frontend.contact.form.primary',
      handler: async () => <div>Module form</div>
    }
  ]
});
```

## Canonical Frontend Routes

Canonical frontend dispatcher:

- `/modules/[moduleId]/[[...slug]]`

Frontend alias resolver:

- `/[...moduleAlias]`

Practical rule:

- aliases are convenience paths
- the dispatcher route remains the canonical contract

## Frontend Route Access Policy

`frontendRouteAccess` controls guard behavior for frontend module pages.

Current values:

- `public`
- `user`
- `admin`

Mental model:

- `public`
  no auth required
- `user`
  requires an authenticated user
- `admin`
  requires admin-level access

If omitted, the default policy is `public`.

## Alias Restrictions

Frontend aliases must:

- use valid path format
- avoid reserved core paths such as `/`, `/pricing`, `/login`, `/admin`,
  `/dashboard`, `/api`, `/modules`
- avoid overlap with aliases from other modules

Practical rule:

- do not document a frontend module only in terms of aliases

## Slot Resolution Model

Frontend slots are the other half of the contract.

Resolution priority:

1. target module slot when a render call passes `moduleId`
2. first enabled module exposing the same slot
3. host or theme fallback

Runtime helper:

- `resolveFrontendModuleSlot(...)` in `lib/modules/runtime.ts`

Host render helper:

- `FrontendModuleSlot` in `components/ui/frontend-module-slot.tsx`

## Example Host Usage

Typical host/theme usage:

```tsx
import { FrontendModuleSlot } from '@/components/ui/frontend-module-slot';

export default async function ContactPage() {
  return (
    <FrontendModuleSlot
      slotId="frontend.contact.form.primary"
      moduleId="mod.contact.us"
      route="/contact-us"
      fallback={<div>Fallback contact form</div>}
    />
  );
}
```

This keeps the page contract stable while still allowing a module to own the
real embedded content.

## Current In-Repo Example

Current example module:

- `modules/mod.example.dashboard`

That module demonstrates:

- `frontendRouteAliases`
- `frontendPage`
- `frontendSlots`
- a concrete slot id:
  `frontend.contact.form.primary`

Current host usage:

- `app/(frontend)/contact-us/page.tsx`

## Practical Design Rule

Use a frontend page when:

- the module should own the full route
- navigation should land in the module surface

Use a frontend slot when:

- the host or theme still owns the page shell
- only one content block should come from the module

Do not use slots as a substitute for a full route when the module really owns
the whole page.

## Common Mistakes

- treating a slot like a full page route
- documenting frontend aliases without naming the canonical dispatcher route
- forgetting `frontendRouteAccess` when the route is not public
- letting slot handlers grow into full business orchestration layers

## Tests Worth Knowing

High-signal coverage:

- `tests/modules/module-runtime.test.ts`

Important expectations covered there include:

- frontend alias validation
- alias collision handling
- frontend route access outcomes
- frontend slot validation and fallback behavior

## Related Docs

- `../routing-and-route-factories.md`
- `../portal-and-module-api-examples.md`
- `../modules-and-sdk-boundaries.md`
