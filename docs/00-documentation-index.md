---
title: Documentation Index
sidebar_position: 0
description: Entry index for core, subscriptions, operations, extensions, SDK, modules, and audit docs.
---

# Documentation Index

> **Using this docs site**: The `/docs` route is powered by [Fumadocs](https://fumadocs.vercel.app/) and reads from the `docs/` directory. Replace the content in `docs/` with your own product documentation. Keep `docs/00-documentation-index.md` as the entry point (the docs index redirects here by default). All other pages can be customized or removed freely.

This index organizes the technical documentation for the S-Kit SaaS Starter core platform.

## First Steps

- [Simple SaaS](./first-steps/01-simple-saas.md) — single Next.js deployment: install, configure, run.
- [Multi-Service](./first-steps/02-multi-service.md) — split admin, dashboard, frontend, and API across separate services.

## Documentation Taxonomy

- `docs/first-steps/*`: onboarding guides for simple and multi-service deployments.
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
3. [Routing System (RouteBuilder + Proxy Chains)](./core/routing-system.md)
4. [Security Architecture (Proxies, JTI Revocation, Rate Limiting)](./core/security.md)
5. [Form Build System](./core/form-build-system.md)
6. [Data Table Build System](./core/build-table-system.md)
7. [Database Model Overview](./core/database-model.md)
8. [Environment Variables and Runtime Config](./core/env-variables.md)
9. [Theme Build-Time Only ADR](./core/theme-build-time-only-adr.md)

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
