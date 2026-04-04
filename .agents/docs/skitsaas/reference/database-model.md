---
title: "Database Model"
sidebar_position: 0
---

# Database Model

Use this page when the task depends on knowing which tables own which runtime
responsibilities.

## Core Identity

Primary identity tables:

- `users`
- `auth_external_identities`
- `auth_sessions`
- `teams`
- `team_members`
- `invitations`

Important semantics:

- one successful login produces an `auth_sessions` ledger record
- request auth depends on both token validity and persisted session state
- admin and dashboard reads do not share the same trust model

## Core Identity Notes

- `auth_external_identities` links one external provider identity to one user
- `auth_sessions` is revocation-friendly and audit-friendly
- `teams` and `team_members` own organization membership, not subscription
  state

## Module-Owned Extension Tables

Core docs do not own module table definitions. Each installed module should
document its own tables in its module README or module-local docs.

Good default rule:

- host tables stay in host docs
- module tables stay with the module

## Subscriptions And Pricing

Main subscription tables:

- `subscription_templates`
- `subscription_template_features`
- `quota_usage`
- `subscription_trial_usage`
- `subscription_assignments`
- `subscription_change_requests`

Important semantics:

- active subscription state is read from `subscription_assignments`
- templates own plan metadata and feature values
- quota consumption is tracked separately from plan configuration
- trial consumption is tracked separately from live assignment state

## Payments

The payment model is intentionally split into layers.

Checkout orchestration:

- `checkout_orders`
- `checkout_order_items`
- `checkout_payment_attempt_logs`

Operational payment lifecycle:

- `payment_orders`
- `payment_logs`

Financial settlement:

- `payment_transactions`

Important rule:

- do not collapse checkout state and settlement state into one mental model

## Runtime Config And Runtime State

Core runtime-state tables:

- `app_configs`
- `app_modules`
- `app_module_migrations`

Legacy compatibility tables:

- `app_themes`
- `user_theme_preferences`

Current guidance:

- current theme runtime is build-time driven
- legacy theme tables remain for migration compatibility, not as the normal
  active source of truth

## Notifications

Main notification tables:

- `system_notifications`
- `system_notification_recipients`

Important semantics:

- notification definitions and recipient state are separate
- team audiences are resolved to user recipients when the notification is
  created
- area visibility is resolved at read time from the current private area and
  role context

## Logs And Audit

Audit-oriented tables:

- `sys_activity_logs`
- `email_logs`

These tables are for observability, evidence, and operations rather than
business-domain state.

## Practical Ownership Rules

Use these rules before writing queries or docs:

- subscription state does not belong on `users` or `teams`
- checkout and settlement are different tables by design
- notification delivery state does not belong on the notification definition
- module tables should not be documented as if they were core tables

## BuildForm Reminder

DB-aware BuildForm checks such as `unique` or `exists` are advisory before
writes. They do not replace real DB constraints.

Keep real integrity in the database with:

- `unique`
- `foreign key`
- `not null`
- `check`

## Related Docs

- `./platform-capabilities.md`
- `./env-and-runtime-config.md`
- `../modules-development/data-config-and-i18n.md`
- `../subscriptions-and-features.md`
- `../notifications-and-delivery.md`
