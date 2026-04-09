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

For the core count-based quotas:

- `dashboard.user.organizations.max`
- `dashboard.team.members.max`

the effective runtime semantics are:

- `-1` = unlimited
- `1..N` = allowed with a finite limit
- `0` = invalid for these two managed keys

`dashboard.team.invites.enabled` is the official gate for allowing or blocking
team invitations.

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
if (!orgFeatures.bool('dashboard.team.invites.enabled', false)) {
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

Reserved system baseline templates:

- `subscription_templates.id = 1` -> baseline `user`
- `subscription_templates.id = 2` -> baseline `organization`

New authenticated users and new teams are provisioned with those templates by
default. As an operational safety net, host feature controllers and the SDK
quota adapter also fall back to the reserved baseline template for the current
scope when an authenticated entity is missing an active assignment.

For the reserved baseline templates, the managed core quota rows are treated as
required baseline data. Admin can edit their values, but those rows are not
meant to disappear from templates `1` and `2`. The admin template editor now
hides the repeater remove control for those protected rows instead of letting
operators attempt an invalid delete. For those protected rows, the feature key
and value type also stay locked in the UI; only label/value/public-facing fields
remain editable.

## Publication status and pricing visibility

`subscription_templates.publication_status` controls self-service visibility:

- `draft` -> editable in Admin, hidden from `/pricing` and self-service checkout
- `published` -> eligible for `/pricing` and self-service checkout

Signup-default behavior uses the same publication rules:

- published zero-cost templates can be assigned directly during password sign-up
- published paid templates can also be used as signup defaults, but they are staged through `signup_intents` and checkout before the real account is created

The reserved baseline templates are initialized as `draft`, kept out of the
normal commercial catalog, and blocked from self-service checkout even if an
operator later tries to treat them like public plans.

Optional public free plans are a separate concern from the reserved baseline
templates. If a SaaS wants a public free tier, that tier should be implemented
with its own published zero-cost template, while templates `1` and `2` remain
internal baseline safety nets. Lifecycle fallback can now be configured to land
on one of those public free templates, but authenticated feature-controller
fallback still treats the reserved baseline templates as the internal default
when an active assignment is missing.

## Module Access via SDK

Modules **must not** import `getDashboardFeatureController`,
`getCurrentFeatureControllerByScope`, or any `@/lib/features/*` path. Those are
host-only helpers.

For module code there are now two approved SDK patterns:

### 1. Read plan configuration only

Use this when the module just needs the value configured on the current plan,
for example a numeric limit, a model tier, or a boolean toggle. This path does
**not** read or mutate `quota_usage`.

```ts
import { getPlanFeatureNumber, getPlanFeatureValue } from '@skitsaas/sdk/server';

const ctx = { teamId: user.teamId, userId: null };

const maxDailyRuns = await getPlanFeatureNumber(
  'mod.analytics.runs.daily.max',
  ctx,
  3
);

const modelTier = await getPlanFeatureValue(
  'mod.analytics.model.tier',
  ctx
);
// → { found: true, valueType: 'text', textValue: 'deep', ... }
```

### 2. Enforce usage-tracked quota

Use this when the feature has a plan-derived limit **and** the module tracks
usage over time.

```ts
import {
  checkFeature,
  getQuotaStatus,
  consumeQuota,
  QuotaExceededError
} from '@skitsaas/sdk/server';

const ctx = { teamId: user.teamId, userId: null };

// Check if a feature is enabled and quota is available
const feature = await checkFeature('mod.analytics.reports.daily', ctx);
if (!feature.enabled || feature.exhausted) { /* 403 / 429 */ }

// Read quota status for a dashboard widget
const status = await getQuotaStatus('mod.analytics.reports.daily', ctx);
// → { limit: 100, used: 47, remaining: 53, resetAt: Date }

// Consume quota (intent-based, strict mode throws QuotaExceededError)
await consumeQuota('mod.analytics.reports.daily', ctx, { strict: true });
```

### Naming policy for module-owned keys

- Prefix module keys with the module id or an equivalent module namespace:
  - `mod.example.suite.items.max`
  - `mod.analytics.runs.daily.max`
  - `mod.analytics.model.tier`
- Use suffixes that reflect intent:
  - `.enabled` for booleans
  - `.max` for numeric limits
  - `.tier`, `.mode`, `.label` for text values
- Scope comes from `QuotaContext` (`teamId` / `userId`), not from the key
  itself, unless the module intentionally publishes separate user/team features.

### Do module keys have to live in `lib/features/catalog.ts`?

No, not by default.

- Host-managed keys such as `dashboard.team.members.max` still belong in
  `lib/features/catalog.ts`.
- Module-owned keys can be stored directly in
  `subscription_template_features` and read through SDK helpers without a
  catalog entry.
- Add a module key to `lib/features/catalog.ts` only if the host wants that key
  to be a first-class managed feature with central validation/defaults/labels in
  the core admin flows.

### Migration path away from direct billing-table joins

Do not join `subscription_assignments` or `subscription_template_features`
inside module code.

- Before: module query joins billing tables to read a plan value.
- After: module uses `getPlanFeatureNumber(...)` or `getPlanFeatureValue(...)`.
- If the module also tracks usage, keep plan reads and quota usage separate:
  - `getPlanFeatureNumber(...)` for the configured plan limit
  - `checkFeature(...)`, `getQuotaStatus(...)`, `consumeQuota(...)` for runtime usage

The SDK bridges module code to the host
`subscription_template_features` + `subscription_assignments` + `quota_usage`
tables via `lib/quota/service.ts` (configured in
`lib/modules/sdk-server-bootstrap.ts`). `lib/features/catalog.ts` remains the
source of truth for host-managed core keys, not a requirement for every
module-owned key.

## Boundaries (What does not belong here)

This document is only for subscription feature keys, quotas, and controller usage.

Keep these topics in their own docs:

- checkout lifecycle and status projection:
  - `docs/subscriptions/payment-events-lifecycle.md`
  - `docs/subscriptions/checkout-subscription-change-checklist.md`
- dashboard subscription UX:
  - `docs/subscriptions/dashboard-subscription-management.md`
- provider-specific auth modules:
  - out of scope for root docs; keep that documentation with the module itself

## Related docs

- Checkout and payment event lifecycle: `docs/subscriptions/payment-events-lifecycle.md`
- Checkout change validation checklist: `docs/subscriptions/checkout-subscription-change-checklist.md`
- Dashboard subscription management screens: `docs/subscriptions/dashboard-subscription-management.md`
