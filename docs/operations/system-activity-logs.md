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
- Read helper: `lib/db/queries.ts` (`getSystemActivityLogsForAdmin`)
- Admin UI: `/admin/logs`

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

## Admin log surface

`/admin/logs` now treats `eventCategory` and `requestId` as first-class
governance fields:

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

## Related technical guide

For payment/subscription event architecture (adapters, metadata envelope, lifecycle executor, and extension examples), see:

- [`Payment Events and Subscription Lifecycle`](../subscriptions/payment-events-lifecycle.md)
