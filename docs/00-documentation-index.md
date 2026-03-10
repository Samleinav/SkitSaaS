---
title: Documentation Index
sidebar_position: 0
description: Entry index for the S-Kit SaaS Starter platform documentation.
---

# Documentation Index

> **Using this docs site**: The `/docs` route is powered by [Fumadocs](https://fumadocs.vercel.app/) and reads from the `docs/` directory. Replace the content in `docs/` with your own product documentation. Keep `docs/00-documentation-index.md` as the entry point (the docs index redirects here by default). All other pages can be customized or removed freely.

This index organizes the technical documentation for the S-Kit SaaS Starter core platform.

## Getting Started

- [Simple SaaS](./getting-started/01-simple-saas.md) — single Next.js deployment: install, configure, run.
- [Multi-Service](./getting-started/02-multi-service.md) — split admin, dashboard, frontend, and API across separate services.

## Routing

How routes are defined, named, and composed across core and modules.

- [App Router Structure and Actions](./routing/01-architecture.md)
- [Route Factories — RouteAdmin, RouteDashboard, routes.ts](./routing/02-routes.md)

## Proxies

Laravel-inspired proxy chains — define auth rules, role guards, and rate limits per route.

- [Security Architecture (Proxies, JTI Revocation, Rate Limiting)](./proxies/02-security.md)

## Forms

Declarative BuildForm system with local, preflight, and server validation layers.

- [Form Build System](./forms/01-form-build-system.md)

## Datatables

SDK-first BuildTable contract with remote loading, filters, sorting, pagination, and actions.

- [Data Table Build System](./datatables/01-build-table-system.md)
- [SDK Datatables & CRUD](./datatables/02-sdk-datatables-crud.md)

## Security

- [Row-Level Security (RLS) Setup](./security/01-rls-setup.md) — PostgreSQL dual-role tenant isolation.
- [Auth Provider SPI](./security/02-auth-provider-spi.md) — pluggable authentication provider interface.

## Context & Areas

Serve different content per user role within the same `/dashboard` path (e.g. guardian / teacher / admin).

- [Frontend Routing and Slots](./context-area/01-frontend-routing-slots.md)

## Modules

Host-side module runtime: manifest, routing, permissions, migrations, API, and i18n.

- [Modules Overview](./modules/00-overview.md)
- [Manifest Registry](./modules/01-manifest-registry.md)
- [Runtime Routing](./modules/02-runtime-routing.md)
- [Permissions and Actions](./modules/03-permissions-actions.md)
- [Database Migrations](./modules/04-database-migrations.md)
- [Config](./modules/05-config.md)
- [Nav Widgets](./modules/06-nav-widgets.md)
- [API Modules](./modules/07-api-modules.md)
- [Testing](./modules/09-testing.md)
- [Ops Runbook](./modules/10-ops-runbook.md)
- [Example Module](./modules/11-example-module.md)
- [I18n](./modules/12-i18n.md)
- [Source Package Template](./modules/13-source-package-template.md)

## Themes

Build-time theme selection (ENV-driven), CTC template resolution, and theme authoring conventions.

- [Theme Runtime](./themes/01-theme-runtime.md)
- [Theme Authoring Guide](./themes/02-theme-authoring-guide.md)
- [Template Controller (CTC)](./themes/03-template-controller.md)
- [Theme Build-Time Only ADR](./themes/04-theme-build-adr.md)

## Hooks & Events

Cross-module event bus with optional Redis queue.

- [Events and Hooks](./hooks/01-events-hooks.md)
- [Events and Hooks Emitters Checklist](./hooks/02-events-hooks-emitters.md)

## Subscriptions and Billing

- [Features and Quotas](./subscriptions/features-and-quotas.md)
- [Payment Events and Subscription Lifecycle](./subscriptions/payment-events-lifecycle.md)
- [Dashboard Subscription Management](./subscriptions/dashboard-subscription-management.md)
- [Checkout Subscription Change Checklist](./subscriptions/checkout-subscription-change-checklist.md)

## Operations

- [Admin Dashboard Modules](./operations/admin-dashboard.md)
- [System Activity Logs](./operations/system-activity-logs.md)
- [Email System (SMTP)](./operations/email-system.md)
- [Ops Validation Pack](./operations/ops-validation-pack.md)
- [Ops Canary Pack](./operations/ops-canary-pack.md)

## Platform Reference

- [Platform Technical Capabilities](./reference/01-platform-capabilities.md)
- [Database Model Overview](./reference/02-database-model.md)
- [Environment Variables and Runtime Config](./reference/03-env-variables.md)
- [I18n Runtime](./reference/04-i18n-runtime.md)
- [SDK Changelog](./reference/05-sdk-changelog.md)

## SDK

- [SDK Overview](./sdk/00-overview.md)

## Extensions

- [Extensions Index](./extensions/module-development-index.md)

## Ownership Policy

- Core docs under `docs/` must document shared host/runtime behavior only.
- Module-specific implementation, env matrices, provider-specific operations, and runbooks must live in module-owned docs:
  - `modules/<moduleId>/README.md`
  - `modules/<moduleId>/docs/*` (optional)
- Core docs should link to module docs instead of duplicating module internals.

## Internal Audit Tracking

- [Documentation Audit Phases](./audit/documentation-audit-phases.md)
- [Baseline Snapshots (2026-02-05)](./audit/baseline-snapshots/2026-02-05/README.md)
- [Canary Evidence Notes (2026-02-05)](./audit/canary-reports/2026-02-05/notes.md)
