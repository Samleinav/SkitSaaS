---
title: Route Map and Actions Overview
sidebar_position: 2
description: High-level route surface map and action/controller file layout for frontend, dashboard, admin, and API surfaces.
---

# Route Map and Actions Overview

Read [Route Factories and Registry](./02-routes.md) first for the actual routing system. This page is only the high-level map of route surfaces and action organization.

This document explains how routes are organized and how server actions are grouped through shared controllers.

## 1) App Router groups

Main groups:

- `app/(frontend)/*` for public marketing/commercial pages
- `app/(login)/*` for auth entrypoints
- `app/(dashboard)/*` for authenticated/private areas

Core private areas:

- `/admin/*` for admin operations
- `/dashboard/*` for end-user operations

Core public areas:

- `/`
- `/pricing`
- `/checkout/[checkoutToken]`
- `/login`
- `/admin/login`

Module dispatchers:

- `/admin/modules/[moduleId]/[[...slug]]`
- `/dashboard/modules/[moduleId]/[[...slug]]`
- `/admin/[...moduleAlias]` (custom module aliases)
- `/dashboard/[...moduleAlias]` (custom module aliases)
- `/api/modules/[moduleId]/[[...slug]]`

## 2) Canonical route map

### Admin routes

- `/admin`
- `/admin/users`
- `/admin/users/[userId]`
- `/admin/subscriptions`
- `/admin/subscriptions/templates`
- `/admin/subscriptions/templates/create`
- `/admin/subscriptions/templates/[templateId]/edit`
- `/admin/subscriptions/organization/[teamId]/edit`
- `/admin/subscriptions/user/[userId]/edit`
- `/admin/suscriptions` (legacy redirect to `/admin/subscriptions`)
- `/admin/suscriptions/organization/[teamId]/edit` (legacy redirect)
- `/admin/suscriptions/user/[userId]/edit` (legacy redirect)
- `/admin/orders`
- `/admin/orders/create`
- `/admin/orders/[orderId]/edit`
- `/admin/payments`
- `/admin/logs`
- `/admin/app-config`
- `/admin/app-config/modules`
- `/admin/app-config/general`
- `/admin/app-config/subscriptions`
- `/admin/app-config/payments-methods`
- `/admin/app-config/email`
- `/admin/billing` (compatibility redirect to `/admin/subscriptions`)

### Dashboard routes

- `/dashboard`
- `/dashboard/general`
- `/dashboard/activity`
- `/dashboard/security`
- `/dashboard/subscriptions`

### Frontend routes

- `/`
- `/pricing`
- `/checkout/[checkoutToken]`

### Auth routes

- `/login` (dashboard login)
- `/admin/login` (admin login)
- `/sign-up`
- `/sign-in` (legacy alias redirecting to `/login`)

Planned auth extensions (future):

- `/recovery`
- `/reset-password`
- `/change-password`

Auth theme policy by area:

- `/admin/login` must always resolve/admin-render with admin theme selection.
- `/login`, `/sign-up`, and future unprefixed auth routes resolve with dashboard theme selection.
- frontend area does not own operational auth lifecycle routes; frontend templates can only redirect to `/login` or submit auth payloads to dashboard auth handlers.
- if one theme is assigned to both `admin` and `dashboard`, the same auth template can be reused for both routes.

## 3) Why actions use a controller

Shared server-action behavior is centralized in:

- `lib/actions/controller.ts`

This provides:

- centralized auth (`requireUser`)
- reusable `FormData` parsing helpers
- optional revalidation callbacks
- consistent failure behavior (`false` return for invalid inputs)

## 4) Admin action architecture

Admin actions are wrapped with `adminAction` from:

- `app/(dashboard)/admin/controller.ts`

Global admin action entrypoint:

- `app/(dashboard)/admin/actions.ts`

Domain action files:

- `app/(dashboard)/admin/users/actions.ts`
- `app/(dashboard)/admin/subscriptions/actions.ts`
- `app/(dashboard)/admin/suscriptions/actions.ts` (legacy compatibility re-export)
- `app/(dashboard)/admin/orders/actions.ts`
- `app/(dashboard)/admin/payments/actions.ts`
- `app/(dashboard)/admin/app-config/actions.ts`

## 5) Dashboard action architecture

Dashboard actions are wrapped with `dashboardAction` from:

- `app/(dashboard)/dashboard/controller.ts`

Global dashboard action entrypoint:

- `app/(dashboard)/dashboard/actions.ts`

Domain action files:

- `app/(dashboard)/dashboard/actions/team.ts`
- `app/(dashboard)/dashboard/general/actions.ts`
- `app/(dashboard)/dashboard/security/actions.ts`
- `app/(dashboard)/dashboard/subscriptions/actions.ts`

## 6) Modules and actions

Module runtime dispatches pages and API handlers. It does not auto-register server actions.

If module code needs mutations, place actions next to module feature code and use the SDK controller:

```ts
'use server'
import {
  createValidatedServerActionController,
  requireUser
} from '@skitsaas/sdk/server'
import { myItemForm } from './forms'

const withValidatedAction = createValidatedServerActionController({
  requireUser: () => requireUser<{ id: number }>()
})
export const createItemAction = withValidatedAction(
  myItemForm,
  async ({ values }) => { ... }
)
```

Do **not** use `adminAction`/`dashboardAction` from host internals in module code — those are core-host utilities not available to SDK-only modules.

Module i18n build pipeline:

- nested module area messages come from `modules/<moduleId>/i18n/<area>/<locale>.json` and are generated by `pnpm modules:i18n`
- flat natural-key translations come from `modules/<moduleId>/i18n/translations/<locale>.json` and are merged by `pnpm i18n:prepare`
- `source-package` / prebuilt modules should emit compiled files under `dist/i18n/...` so the host can consume built artifacts without source fallbacks

## 7) Server action guard policy

Every admin and dashboard server action that performs a mutation **must** be wrapped
by a controller that enforces server-side auth (`requireAdminUser` / `requireDashboardUser`).
Page access and form rendering are not sufficient — a user with a crafted request could
bypass the UI and call an action directly.

The correct wrappers are:

| Area | Controller | Auth enforced |
|------|-----------|---------------|
| Admin | `adminAction` / `adminValidatedAction` (from `app/(dashboard)/admin/controller.ts`) | `requireAdminUser()` |
| Dashboard | `dashboardAction` / `dashboardValidatedAction` (from `app/(dashboard)/dashboard/controller.ts`) | `requireDashboardUser()` |

Both controllers call `requireUser()` as their first step, before any handler code runs.
If `requireUser()` calls `redirect()`, execution stops and the handler never runs.

**Adding a new form action:** register it in `lib/forms/registry.ts` under
`buildFormControllerSubmitActions` — only add controller-wrapped actions. Raw async
functions are not permitted there. A test in `tests/forms/build-form-action-guards.test.ts`
covers the controller mechanism.

## 8) API routes vs server actions — when to use each

Use server actions when handling form submissions from React server components.

Use API routes for:

- module APIs (`/api/modules/*`)
- form validation preflight (`/api/forms/validate`)
- external integrations and webhook endpoints
- non-React or programmatic clients

BuildForm preflight operational notes:

- `/api/forms/validate` is intended for read-only validation, not final mutation submits
- host deployments should pair it with a real distributed limiter via `configureBuildFormPreflightRateLimit(...)`
- the host now emits lightweight system activity log events for blocked preflight requests and missing BuildForm DB resolvers
- operators can inspect those signals in `/admin/logs` by filtering `eventCategory='forms'`

## 9) Checkout and Payment API (order-first)

Canonical checkout routes:

- `POST /api/checkout/[checkoutToken]/pay/[paymentMethodId]` (start payment for a checkout order)
- `GET /api/checkout/methods` (discover available checkout payment methods)
- `POST /api/checkout/methods/[paymentMethodId]/cancel`
- `GET|POST /api/checkout/methods/[paymentMethodId]/return`
- `POST /api/checkout/methods/[paymentMethodId]/webhook`

Compatibility routes kept during migration:

- Stripe:
  - `/api/stripe/checkout`
  - `/api/stripe/webhook`
- PayPal:
  - `/api/paypal/plan`
  - `/api/paypal/checkout`
  - `/api/paypal/checkout/cancel`
  - `/api/paypal/webhook`

Migration note:

- Compatibility routes are kept to avoid breaking existing integrations, but canonical integrations should target `/api/checkout/*`.
- Current target removal date for direct legacy usage is `2026-06-30` (usage is tracked via system activity logs).
