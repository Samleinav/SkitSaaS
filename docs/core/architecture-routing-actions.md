---
title: Routing and Actions Architecture
sidebar_position: 2
description: Route layout and action/controller structure for frontend, dashboard, admin, and API surfaces.
---

# Routing and Actions Architecture

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
- `/admin/subscriptions/create`
- `/admin/subscriptions/[templateId]/edit`
- `/admin/suscriptions` (legacy/operational subscription assignments)
- `/admin/suscriptions/organization/[teamId]/edit`
- `/admin/suscriptions/user/[userId]/edit`
- `/admin/orders`
- `/admin/orders/create`
- `/admin/orders/[orderId]/edit`
- `/admin/payments`
- `/admin/logs`
- `/admin/app-config`
- `/admin/app-config/general`
- `/admin/app-config/payments-methods`
- `/admin/app-config/email`
- `/admin/billing` (compatibility redirect to `/admin/suscriptions`)

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
- `app/(dashboard)/admin/suscriptions/actions.ts`
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

Module runtime currently dispatches pages and API handlers. It does not auto-register server actions.

If module code needs mutations:

- place actions next to module feature code
- wrap with `adminAction` or `dashboardAction`
- enforce role/plan/feature checks inside the action handler

## 7) API routes vs server actions

Use server actions when handling form submissions from React server components.

Use API routes for:

- module APIs (`/api/modules/*`)
- external integrations and webhook endpoints
- non-React or programmatic clients

## 8) Checkout and Payment API (order-first)

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
