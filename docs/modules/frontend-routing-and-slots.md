---
title: Frontend Routing and Slots
sidebar_position: 15
---

# Frontend Routing and Slots

This guide describes the frontend module routing contract and slot integration model.

## What this enables

- Modules can own frontend routes without editing core route pages.
- Themes/pages can embed module UI by `slotId` without direct module imports.
- Host runtime keeps route safety, auth policy, and fallbacks centralized.

## Manifest contract

Frontend module surface in `ModuleManifest`:

- `frontendPage?: ModulePageHandler`
- `frontendRouteAliases?: string[]`
- `frontendRouteAccess?: 'public' | 'user' | 'admin'`
- `frontendNavItems?: ModuleNavItem[]`
- `frontendSlots?: { slotId: string; handler: ModuleFrontendSlotHandler }[]`

Example:

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

## Runtime routes

Canonical frontend dispatcher:

- `/modules/[moduleId]/[[...slug]]`

Frontend alias resolver:

- `/[...moduleAlias]`

Alias restrictions:

- Must be valid path format (no `?`, `#`, `[]`, duplicated slashes)
- Must not conflict with reserved core paths (for example `/`, `/pricing`, `/login`, `/admin`, `/dashboard`, `/api`, `/modules`)
- Must not overlap aliases from other modules

## Frontend auth policy

`frontendRouteAccess` controls guard behavior for frontend module pages:

- `public`: no auth required
- `user`: requires authenticated user (`/login` redirect when missing)
- `admin`: requires admin role (`/login` if missing user, `/dashboard` if non-admin)

Default policy is `public` when field is omitted.

## Slot resolution model

`slotId` resolution priority:

1. Target module slot (when render call passes `moduleId`)
2. First enabled module exposing same slot
3. Host/theme fallback

Runtime helper:

- `resolveFrontendModuleSlot(...)` in `lib/modules/runtime.ts`

Host render helper:

- `FrontendModuleSlot` in `components/ui/frontend-module-slot.tsx`

Example usage:

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

## Current pilot

Current workspace pilot:

- Slot id: `frontend.contact.form.primary`
- Provider module: `mod.example.dashboard`
- Host page: `/contact-us`

## Test coverage

Main coverage:

- `tests/modules/module-runtime.test.ts`
  - frontend alias validation/collision
  - frontend route access policy and outcomes
  - frontend slot manifest validation
  - slot provider priority/fallback

## Notes

- Keep module slot handlers presentation-focused. Business mutations should stay in host actions/APIs.
- Prefer slot contracts over shortcodes to keep typed runtime resolution and safer fallbacks.
