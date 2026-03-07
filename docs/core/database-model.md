---
title: Database Model Overview
sidebar_position: 3
description: Core relational model summary for auth, subscriptions, payments, themes, modules, and audit trails.
---

# Database Model Overview

This doc summarizes the core tables and their responsibilities.

## Core identity

- `users` - accounts
- `auth_external_identities` - linked external identities (`provider_id` + `provider_subject` -> user)
- `auth_sessions` - revocation-friendly session ledger (`session_id`/`token_jti`, status, expiry, revoke metadata)
- `teams` - organizations
- `team_members` - user membership per team
- `invitations` - team invites

### Core identity semantics

- External identity linking is unique by (`provider_id`, `provider_subject`) and is updated in place on re-login.
- A successful login creates one `auth_sessions` record with `status='active'`.
- Sign-out/account delete revokes the current session record (`status='revoked'`, `revoked_at`, `revoked_reason`).
- Request authentication validates both JWT signature/expiry and the persisted `auth_sessions` state.
- Retention policy recommendation: keep revoked/expired sessions for audit, then purge with a scheduled cleanup job (for example after 30-90 days, based on compliance needs).

## Module-owned extension tables

This document covers core tables only. Each installed module owns its own tables and documents them in its module `README.md`.

## Subscriptions and pricing

- `subscription_templates` - plan catalog
  - includes scope + hierarchy metadata (`target_scope`, `category_key`, `hierarchy_rank`)
  - includes PayPal plan metadata (`paypal_product_id`, `paypal_plan_id`, `paypal_plan_fingerprint`)
  - includes optional PayPal no-trial plan metadata (`paypal_plan_id_no_trial`, `paypal_plan_fingerprint_no_trial`)
- `subscription_template_features` - features/quota values per template
- `subscription_trial_usage` - one-time trial consumption ledger per target (`team`/`user`) and category
- `subscription_assignments` - active subscription per target (team/user) + billing period tracking
- `subscription_change_requests` - scheduled subscription changes (carryover)

## Payments

Operational flow:

- `payment_orders` - order timeline and targets
- `payment_logs` - raw provider event logs

Financial flow:

- `payment_transactions` - captured payments, refunds, fees

## Configuration and runtime

- `app_configs` - generic runtime config (payments, email, org policy, themes)
- `app_modules` - module runtime state
- `app_module_migrations` - module migration ledger (`module_id`, migration name, checksum, schema version)
- `app_themes` - legacy theme catalog table (kept for migration compatibility, not used by current theme system)
- `user_theme_preferences` - legacy per-user theme override table (kept for migration compatibility; runtime theme switching per user was removed — theme is now build-time only)

## Logs and audit

- `sys_activity_logs` - cross-domain audit trail
- `email_logs` - SMTP delivery audit

## Notes

- Subscription state is **not** stored on `teams` or `users`. It is read from `subscription_assignments`.
- Orders and transactions are separate by design.
- `BuildForm` DB-aware validation (`unique`, `exists`) may read tables such as `users` or `subscription_templates`, but those checks are only advisory before writes.
- Real integrity must still be enforced by database constraints such as `unique`, `foreign key`, `not null`, and `check`.
- Legacy template backfill recommendation:
  - set `category_key` from a normalized template family key (for example normalized name/domain key)
  - set `hierarchy_rank` to `0` when no explicit commercial hierarchy is known yet
