---
title: Email System (SMTP)
sidebar_position: 10
---

# Email System (SMTP)

This project sends transactional notifications only through external SMTP.

Local SMTP hosts such as `localhost`, `127.0.0.1`, and `::1` are blocked.

## Configuration

SMTP settings can be configured in either:

- Environment variables (`SMTP_*`)
- Admin App Config (`/admin/app-config/email`) as DB fallback values

Environment values have priority over DB values.

Required keys:

- `SMTP_HOST`
- `SMTP_PORT` (default fallback `587`)
- `SMTP_SECURE` (`true/false`)
- `SMTP_FROM_EMAIL`

Optional keys:

- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_NAME`
- `SMTP_REPLY_TO_EMAIL`

## Logging

Every send attempt is stored in `email_logs` with:

- recipient email/user
- triggering event
- status (`queued`, `sent`, `failed`, `skipped`)
- subject/source
- SMTP response message id (when available)
- metadata payload

Admin UI for logs:

- `/admin/logs?tab=email`

## Current integration

Template pricing updates trigger notification emails through:

- `emitTemplatePricingChangedEvent(...)`
- `queueTemplatePriceChangeNotificationEmails(...)`

Source file:

- `lib/payments/checkout-system.ts`
