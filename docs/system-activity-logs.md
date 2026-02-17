---
title: System Activity Logs
sidebar_position: 9
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

- [`Payment Events and Subscription Lifecycle`](./payment-events.md)
