---
title: Documentation Index
sidebar_position: 0
description: Entry index for core, subscriptions, operations, extensions, SDK, modules, and audit docs.
---

# Documentation Index

This index organizes the technical documentation for publication in Docusaurus.

## Documentation Taxonomy

- `docs/core/*`: host runtime architecture and platform contracts.
- `docs/subscriptions/*`: subscription features, quotas, checkout lifecycle and guards.
- `docs/operations/*`: operational guidance for core surfaces (admin/logs/email/events).
- `docs/extensions/*`: entrypoint to extension surfaces documentation.
- `docs/modules/*`: host-side module runtime contracts (not per-module implementation docs).
- `docs/sdk/*`: SDK contracts and migration guidance.
- `docs/audit/*`: evidence and audit artifacts.

## Ownership Policy

- Core docs under `docs/` must document shared host/runtime behavior only.
- Module-specific implementation, env matrices, provider-specific operations, and runbooks must live in module-owned docs:
  - `modules/<moduleId>/README.md`
  - `modules/<moduleId>/docs/*` (optional)
- Core docs should link to module docs instead of duplicating module internals.

Exceptions (allowed in core docs):

- A short module mention for platform capability mapping.
- Stable host-side integration contract references (for example, dispatcher paths, manifest contract points, extension hook surfaces).

## Core Platform (Read First)

1. [Platform Technical Capabilities](./core/platform-capabilities.md)
2. [Routing and Actions Architecture](./core/architecture-routing-actions.md)
3. [Database Model Overview](./core/database-model.md)
4. [Environment Variables and Runtime Config](./core/env-variables.md)
5. [Theme Build-Time Only ADR](./core/theme-build-time-only-adr.md)

## Billing and Subscription Flows

1. [Features and Quotas](./subscriptions/features-and-quotas.md)
2. [Payment Events and Subscription Lifecycle](./subscriptions/payment-events-lifecycle.md)
3. [Dashboard Subscription Management](./subscriptions/dashboard-subscription-management.md)
4. [Checkout Subscription Change Checklist](./subscriptions/checkout-subscription-change-checklist.md)

## Admin and Operations

1. [Admin Dashboard Modules](./operations/admin-dashboard.md)
2. [System Activity Logs](./operations/system-activity-logs.md)
3. [Email System (SMTP)](./operations/email-system.md)
4. [Events and Hooks](./operations/events-hooks.md)
5. [Events and Hooks Emitters Checklist](./operations/events-hooks-emitters.md)
6. [Row-Level Security (RLS) Setup](./operations/rls-setup.md)
7. [Ops Validation Pack](./operations/ops-validation-pack.md)
8. [Ops Canary Pack](./operations/ops-canary-pack.md)

## Extension Surfaces

1. [Extensions Index](./extensions/module-development-index.md)
2. [Modules Overview](./modules/00-overview.md)
3. [SDK Overview](./sdk/00-overview.md)

## Internal Audit Tracking

- [Documentation Audit Phases](./audit/documentation-audit-phases.md)
- [Baseline Snapshots (2026-02-05)](./audit/baseline-snapshots/2026-02-05/README.md)
- [Canary Evidence Notes (2026-02-05)](./audit/canary-reports/2026-02-05/notes.md)
