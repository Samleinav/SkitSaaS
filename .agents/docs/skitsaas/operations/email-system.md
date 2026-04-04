---
title: "Email System"
sidebar_position: 0
---

# Email System

Use this page when the task depends on transactional email delivery, SMTP
configuration, or email audit behavior.

## Delivery Model

Current host policy:

- transactional notifications are sent through external SMTP
- local SMTP hosts such as loopback/local addresses are blocked

That keeps delivery closer to real production behavior and avoids silent local
fake-mail assumptions in normal runtime config.

## Configuration Sources

SMTP settings can come from:

- environment variables
- admin app-config fallback values

Env still wins over DB fallback values.

## Required Keys

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_FROM_EMAIL`

## Optional Keys

- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_NAME`
- `SMTP_REPLY_TO_EMAIL`

## Audit Table

Delivery audit table:

- `email_logs`

This table records send attempts and delivery outcomes.

Useful fields include:

- recipient email or user
- triggering event
- status
- subject and source
- message id when available

## Admin Surface

Current admin logs UI:

- `/admin/logs?tab=email`

Use that surface first for operational review.

## Runtime Thinking

Email work should usually be treated as:

- a delivery concern
- an audit concern
- often an event-driven side effect

That means it often belongs near events, notifications, and operational review,
not only inside the original action.

## Common Mistakes

- documenting SMTP variables without mentioning DB fallback behavior
- treating email delivery as if it had no audit surface
- coupling email too tightly to one controller when an event-driven flow is
  clearer

## Related Docs

- `../events-and-hooks.md`
- `../checkout-side-effects-playbook.md`
- `../reference/env-and-runtime-config.md`
