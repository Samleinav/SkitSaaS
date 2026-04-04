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

The host feature catalog defines:

- official keys
- target scope
- value type
- defaults
- numeric minimums or limits

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
