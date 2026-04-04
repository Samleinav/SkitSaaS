---
title: "Operations"
sidebar_position: 0
---

# Operations

This section is the Botble-style operations layer for SkitSaaS. It exists so
runtime validation, audit surfaces, and delivery services can be understood
without digging through scripts and admin pages first.

## What This Section Covers

Use this section when the task is:

- tracing platform behavior through logs
- understanding SMTP and delivery audit behavior
- validating a deployment or staging environment
- preparing smoke, canary, or evidence workflows

## Read Order

1. [Admin Dashboard Runtime](./admin-dashboard.md)
2. [System Activity And Audit Logs](./system-activity-and-audit-logs.md)
3. [Email System](./email-system.md)
4. [Validation And Canary](./validation-and-canary.md)

## Related Main Docs

- `../reference/platform-capabilities.md`
- `../reference/env-and-runtime-config.md`
- `../events-and-hooks.md`
- `../notifications-and-delivery.md`

## Practical Rule

If the question is "how do we know this happened?" or "how do we validate this
deployment?", start here before reading feature code.
