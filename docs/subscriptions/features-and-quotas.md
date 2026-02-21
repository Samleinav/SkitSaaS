---
title: Features and Quotas
sidebar_position: 1
description: Subscription feature key catalog usage, scope rules, and quota controller integration.
---

# Features and Quotas

This guide explains how to create and use subscription features with scoped behavior:

- `user`: applies to the user (e.g. `dashboard.user.organizations.max`)
- `organization`: applies to the current organization/team (e.g. `dashboard.team.members.max`)

The template scope is defined in DB with `subscription_templates.target_scope`.

## Where they are defined

Central file:

- `lib/features/catalog.ts`

This file defines:

- official key
- `targetScope` (`user` or `organization`)
- value type (`boolean`, `number`, `text`, `null`)
- default
- minimum/maximum values (for numeric quotas)

## How to create a new feature

1. Add the key to `SUBSCRIPTION_FEATURE_KEYS`.
2. Create its typed definition (e.g. `NumberFeatureDefinition`).
3. Add it to `SUBSCRIPTION_FEATURE_DEFINITIONS`.
4. (Optional) expose it in a domain object such as:
   - `DASHBOARD_SUBSCRIPTION_FEATURES`
   - `USER_SUBSCRIPTION_FEATURES`

Naming convention:

- `dashboard.user.*` => scope `user`
- `dashboard.team.*` or `dashboard.organization.*` => scope `organization`

## How to use them in code

### 1) Resolve a controller by scope

```ts
import { getDashboardFeatureController } from '@/app/(dashboard)/dashboard/controller';

const orgFeatures = await getDashboardFeatureController('organization');
const userFeatures = await getDashboardFeatureController('user');
```

### 2) Evaluate flags/quotas

```ts
if (!orgFeatures.bool('dashboard.team.invites.enabled', true)) {
  return { error: 'Invites disabled' };
}

const maxMembers = orgFeatures.int('dashboard.team.members.max', null);
```

### 3) Recommended: use keys from the catalog

```ts
import { DASHBOARD_SUBSCRIPTION_FEATURES } from '@/lib/features/catalog';

const maxMembers = orgFeatures.int(
  DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key,
  DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.defaultValue
);
```

## Automatic validations in Admin

`app/(dashboard)/admin/subscriptions/actions.ts` normalizes managed features using the catalog:

- applies value type rules
- applies minimum/maximum constraints
- ignores managed features that do not match the template `targetScope`

## Useful helpers

- `lib/features/subscription.ts`
  - `getCurrentFeatureControllerByScope(scope)`
  - `getCurrentScopedFeatureController()`
- `lib/organizations/subscription-limits.ts`
  - helper for per-user organization quota (`dashboard.user.organizations.max`)

## Runtime source of truth

Current subscription state comes from `subscription_assignments`. The controller helpers resolve the active
assignment (user or team) and then apply the template features for that scope.

## Boundaries (What does not belong here)

This document is only for subscription feature keys, quotas, and controller usage.

Keep these topics in their own docs:

- checkout lifecycle and status projection:
  - `docs/subscriptions/payment-events-lifecycle.md`
  - `docs/subscriptions/checkout-subscription-change-checklist.md`
- dashboard subscription UX:
  - `docs/subscriptions/dashboard-subscription-management.md`
- auth modules and provider-specific behavior:
  - `modules/mod.auth.passkey/README.md`
  - `modules/mod.auth.social-logins/README.md`

## Related docs

- Checkout and payment event lifecycle: `docs/subscriptions/payment-events-lifecycle.md`
- Checkout change validation checklist: `docs/subscriptions/checkout-subscription-change-checklist.md`
- Dashboard subscription management screens: `docs/subscriptions/dashboard-subscription-management.md`

