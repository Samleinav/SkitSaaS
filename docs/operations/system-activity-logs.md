---
title: System Activity Logs
sidebar_position: 2
---

# System Activity Logs

This guide documents admin/system audit logging using `sys_activity_logs`.

Use this table for cross-domain events (admin actions, payments, orders, updates, create/delete operations), instead of `activity_logs` which is focused on user/team activity.

For operational payment orders (`received`, `canceled`, `failed`, etc.), use `payment_orders` instead.
For SMTP delivery/audit details, use `email_logs` instead.

## Where it is defined

- Table schema: `lib/db/schema.ts` (`sys_activity_logs`)
- Write helper: `lib/system/activity-logs.ts` (`createSysActivityLog`)
- Read helper: `lib/db/queries.admin.ts` (`getSystemActivityLogsForAdmin`)
- Admin UI:
  - `/admin/logs` (system logs)
  - `/admin/logs?tab=checkout` (checkout callback logs)
  - `/admin/logs?tab=email` (email logs)

Portable module reads:

- `@skitsaas/sdk/server` exposes `listSystemActivityLogs(...)` as a read-only,
  admin-scoped bridge to the same core query
- modules should use that helper instead of importing `queries.admin` directly

## Write path expectations

`sys_activity_logs` is an admin/governance sink.

- writes should go through `createSysActivityLog(...)`
- the helper persists through `adminDb` / `saas_admin`
- the helper is best-effort: write failures must not break the caller's critical
  path
- when the sink fails, the helper still leaves local console evidence with
  `eventType`, `source`, and `requestId`

This matters in split-role deployments because `saas_app` does not have access
to `sys_activity_logs` under the RLS/grants model.

## Request correlation

Sensitive request flows should include a stable `requestId` when they emit
multiple operational or security events.

Current baseline:

- proxy-chain responses now return `x-request-id`
- auth/session audit logging generates a stable request id per `Request` object
  when the inbound request did not already provide one
- `createSysActivityLog(...)` stores the normalized `requestId` field without
  changing the existing admin read queries
- module dispatch failures now emit both migration metrics and
  `sys_activity_logs` entries (`eventCategory = 'module_runtime'`)

## Canonical categories

The current canonical category set is:

- `admin`
- `api`
- `auth`
- `checkout`
- `dashboard`
- `email`
- `event_bus`
- `forms`
- `module_runtime`
- `navigation`
- `payments`
- `proxy`
- `system`

Writers should use these categories for new events. The helper normalizes
spacing/hyphen variants (for example `module-runtime` -> `module_runtime`) and
falls back to `system` for unknown values.

## High-value event type families

High-value governance event types should stay inside a small set of canonical
families so they can be filtered without parsing arbitrary free text. The
current baseline families are:

- `auth.break_glass.password`
- `auth.password_sign_in`
- `auth.session.*`
- `auth.proxy.*`
- `auth.api.*`
- `auth.provider_handoff.*`
- `admin.users.*`
- `admin.orders.*`
- `admin.subscriptions.*`
- `dashboard.subscriptions.*`
- `build_form.*`
- `module.dispatch.failed`
- `checkout.method.*`
- `checkout.legacy_route.used`
- `billing.*`
- `webhook.*`

New emitters should prefer one of these families before inventing a new root
namespace.

## Current storage decision

For the current core, `sys_activity_logs` remains the canonical governance sink.
We are **not** adding a sister request/security telemetry table yet.

Reasoning:

- the current evidence needs are still event-oriented, not span-oriented
- request correlation is already covered by `requestId`
- most high-value questions still map to event category + event type + actor +
  entity + time

Revisit this decision only when one of these becomes true:

- per-request telemetry volume becomes materially larger than normal audit/event
  volume
- we need raw request/response metadata, spans, or repeated checkpoint logs for
  the same request
- retention requirements for dense telemetry diverge from normal audit logs

At that point, add a sibling table or external sink rather than overloading
`sys_activity_logs`.

## Retention baseline

Current governance policy baseline:

- keep high-value `sys_activity_logs` rows for at least `90 days` in the primary
  database
- prefer external archival/export before extending the core table into dense
  telemetry storage
- do not persist raw secrets, tokens, or full request bodies in `metadata`
- keep `metadata` concise and structured enough for filtering, not as a dump of
  arbitrary payloads

## Query/index baseline

The core now keeps a minimal index set aligned with the main governance read
paths:

- `createdAt`
- `eventCategory + createdAt`
- `actorUserId + createdAt`
- `requestId`
- `entityType + entityId + createdAt`

This matches the current admin/SDK filters without turning `sys_activity_logs`
into a dense telemetry table.

## Admin log surface

`/admin/logs` now acts as the admin log-table selector for governance surfaces.
The default system view treats `eventCategory` and `requestId` as first-class
fields:

- category filter in the system logs table
- free-text search across event type, source, request id, and message
- explicit request-id column for incident correlation

Payment orders reference:

- Table schema: `lib/db/schema.ts` (`payment_orders`)
- Write helper: `lib/payments/orders.ts` (`upsertPaymentOrder`)
- Read helper: `lib/db/queries.ts` (`getPaymentOrdersForAdmin`)
- Admin UI:
  - `/admin/orders` (operational order history + status editing)
  - `/admin/orders/create` (manual order creation)
  - `/admin/payments` (completed payments with quick invoice preview)

Email logs reference:

- Table schema: `lib/db/schema.ts` (`email_logs`)
- Write helper: `lib/email/logs.ts` (`createEmailLog`)
- SMTP sender: `lib/email/smtp.ts` (`sendSmtpEmail`)
- Admin UI: `/admin/logs?tab=email`

Checkout callback logs reference:

- Table schema: `lib/db/schema.ts` (`checkout_payment_attempt_logs`)
- Write helper: `lib/payments/attempt-logs.ts` (`createCheckoutPaymentAttemptLog`)
- Read helper: `lib/db/queries.admin.ts` (`getCheckoutCallbackAttemptsForAdmin`)
- Admin UI: `/admin/logs?tab=checkout`

## Related technical guide

For payment/subscription event architecture (adapters, metadata envelope, lifecycle executor, and extension examples), see:

- [`Payment Events and Subscription Lifecycle`](../subscriptions/payment-events-lifecycle.md)
