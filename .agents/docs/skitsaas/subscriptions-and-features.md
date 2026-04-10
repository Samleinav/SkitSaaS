---
title: "Subscriptions And Features"
sidebar_position: 0
---

# Subscriptions And Features

Plan-aware behavior in SkitSaaS usually means one of two things:

- host-managed features and quotas
- module-consumed plan values or quota services through the SDK

## Host Feature System

Key files:

- `lib/features/catalog.ts`
- `lib/features/controller.ts`
- `lib/features/subscription.ts`
- `lib/payments/subscription-default-templates.ts`
- `lib/quota/service.ts`

The host feature catalog defines:

- official keys
- target scope
- value type
- defaults
- numeric minimums or limits

Current core count-quota semantics:

- `dashboard.user.organizations.max`
- `dashboard.team.members.max`

For these keys:

- `-1` means unlimited
- `1..N` means a finite allowed limit
- `0` is invalid and should not be persisted by normal admin flows

`dashboard.team.invites.enabled` is the canonical gate for invite permission.

## Feature Controller

The core controller API is small and important:

- `feature(key)`
- `has(key)`
- `can(key, required)`
- `number(key)`
- `int(key)`
- `bool(key)`

This is the main way host code evaluates plan behavior.

## Scope Model

Core feature scope is usually:

- `user`
- `organization`

Examples:

- `dashboard.user.organizations.max`
- `dashboard.team.members.max`

Reserved default-tier templates:

- `subscription_templates.id = 1`
  default tier for `user`
- `subscription_templates.id = 2`
  default tier for `organization`

Operational rule:

- authenticated user/team paths should assume those reserved templates define
  the default behavior, not `null` assignment
- feature controllers and the quota adapter use the reserved default tier as the
  fallback for authenticated scopes when assignment data is missing
- the managed core rows inside templates `1` and `2` are default-tier data that
  should be preserved even when admins edit those templates
- admin template UI should keep those required rows editable but non-removable;
  use BuildForm repeater rows with `removable: false` instead of showing a
  remove button that later fails on submit
- for those same protected rows, lock `featureKey` and `featureValueType` with
  repeater `lockedFields` so operators can still edit label/value metadata
  without changing the managed feature identity
- templates `1` and `2` can be published; if one is `published` with
  `price_cents = 0`, it is the public free tier for that scope
- published zero-cost templates must be assignable from pricing without Stripe
  or PayPal being configured
- published paid templates can still be the public signup default, but they must
  go through `signup_intents` + checkout before the real account is created
- paid failures/cancellations fall back by target scope to the reserved default
  tier (`id=1` user, `id=2` organization)
- fallback assignment status is `free` only when that default tier has
  `price_cents = 0`; otherwise use `unpaid`

## Module Consumption Through SDK

Module code should not directly join billing tables.

Preferred SDK patterns:

- read plan values with SDK feature helpers
- enforce usage through SDK quota helpers

The host wires those services from `lib/modules/sdk-server-bootstrap.ts`.

## Why This Matters

Without this rule, module code becomes tightly coupled to:

- `subscription_assignments`
- `subscription_template_features`
- `quota_usage`

The SDK exists to hide that coupling.

## Common Mistakes

- hardcoding feature keys in multiple places when a central catalog exists
- using host-only feature helpers inside portable module code
- mixing plan configuration reads and runtime quota usage into one ad-hoc query
