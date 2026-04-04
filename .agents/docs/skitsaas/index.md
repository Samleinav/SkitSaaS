---
title: "SkitSaaS Reference"
sidebar_position: 0
---

# SkitSaaS Reference

This folder is a parallel reference set for SkitSaaS. It does not replace the
official `docs/` site and it does not feed the app docs route today.

The goal here is different:

- give agents a faster mental model of the platform
- organize the runtime more like an operational manual
- make built-in helpers easier to discover before reinventing them
- keep the structure closer to how people explore Botble-style docs

## What SkitSaaS really is

SkitSaaS is a Next.js SaaS host with a Laravel-inspired runtime mindset:

- route factories instead of hardcoded URL strings everywhere
- proxy chains instead of assuming one global middleware model
- BuildForm and BuildTable as first-class platform primitives
- manifest-driven modules instead of ad-hoc feature folders
- theme and template resolution through CTC instead of one fixed UI renderer
- plan features, quotas, notifications, and hooks as platform services

## Read This First

1. [Getting Started](./getting-started/index.md)
2. [AI Assistant Guide](./ai-assistant-guide.md)
3. [Source Code Structure](./source-code-structure.md)
4. [Request Lifecycle](./request-lifecycle.md)

Then jump to the task-specific page:

| If the task is about... | Read next |
|---|---|
| Routes, URL helpers, auth flow, aliases | [Routing and Route Factories](./routing-and-route-factories.md) |
| Middleware-like enforcement, API auth, rate limits | [Proxies and API Security](./proxies-and-api-security.md) |
| Portal areas and internal rewrites | [Portals and Aliases](./portals-and-aliases.md) |
| Concrete portal and module API examples | [Portal And Module API Examples](./portal-and-module-api-examples.md) |
| Frontend module routes and slot embedding | [Context Area](./context-area/index.md) |
| Platform capabilities, core tables, env config, i18n runtime, SDK change tracking | [Platform Reference](./reference/index.md) |
| Trust boundaries, RLS, and auth provider extension points | [Security](./security/index.md) |
| Logs, admin dashboard runtime, SMTP, smoke checks, and canary workflow | [Operations](./operations/index.md) |
| Documentation hygiene, evidence, and SDK change tracking | [Audit](./audit/index.md) |
| Forms, validations, submit flows | [Forms and Validation](./forms-and-validation.md) |
| End-to-end admin/dashboard CRUD recipe | [Admin CRUD Playbook](./admin-crud-playbook.md) |
| Tables, remote loading, row actions | [Datatables and Remote Actions](./datatables-and-remote-actions.md) |
| Themes, `ui.form`, `ui.table`, CTC | [Themes and CTC](./themes-and-ctc.md) |
| Botble-style module authoring section | [Modules Development](./modules-development/index.md) |
| Module permissions, actions, API auth, and rate limits | [Permissions and Actions](./modules-development/permissions-and-actions.md) |
| Module nav items, widgets, and notification strategy | [Navigation, Widgets, and Notifications](./modules-development/navigation-widgets-and-notifications.md) |
| Concrete `source-package` module starter | [Source-Package Worked Example](./modules-development/source-package-worked-example.md) |
| Concrete `source-host` module starter | [Source-Host Worked Example](./modules-development/source-host-worked-example.md) |
| One module spanning aliases, API, widgets, hooks, and quotas | [Composite Module Worked Example](./modules-development/composite-module-worked-example.md) |
| Module runtime, SDK boundaries, manifest design | [Modules and SDK Boundaries](./modules-and-sdk-boundaries.md) |
| Starting a new module end-to-end | [Module Starter Playbook](./module-starter-playbook.md) |
| Public SDK surface and migration path | [SDK](./sdk/index.md) |
| Botble-style theme authoring section | [Theme Development](./theme-development/index.md) |
| Concrete frontend/backoffice theme pack starter | [Theme Pack Worked Examples](./theme-development/theme-pack-worked-examples.md) |
| Backoffice theme overrides with area split and precedence | [Backoffice Override Worked Example](./theme-development/backoffice-override-worked-example.md) |
| Event bus, hook emitters, and queue flow | [Hooks](./hooks/index.md) |
| Persisted notification flow and inbox behavior | [Notifications And Delivery](./notifications-and-delivery.md) |
| Checkout-driven hooks, quota checks, and side effects | [Checkout Side Effects Playbook](./checkout-side-effects-playbook.md) |
| Module enablement, runtime sync, and dispatcher smoke checks | [Module Ops Runbook](./modules-development/ops-runbook.md) |
| Subscription lifecycle, dashboard management, checkout change rules | [Subscriptions](./subscriptions/index.md) |
| Plan features, quotas, billing-driven behavior | [Subscriptions and Features](./subscriptions-and-features.md) |

## Core Ideas

- Start from the runtime surface first:
  admin, dashboard, frontend, portal, core API, or module API.
- Keep task docs and platform manual docs separate:
  build flow docs answer "how", reference docs answer "what exists".
- Treat page traffic and API traffic as different security pipelines.
- Assume the repo already has a platform helper before building a custom one.
- Prefer SDK contracts first, especially for module code.
- Treat `source-host` as convenient but more coupled, and `source-package` as
  the portability target.
- Verify the exact contract in `app/sdk/src/*` and `lib/*` only after the docs
  pass says which area you are actually touching.

## Canonical Examples

- `modules/mod.example.package`:
  portable `source-package` module with SDK forms and tables, plus legacy
  `apiHandler`
- `modules/mod.example.api`:
  preferred typed `apiRoutes` example
- `modules/mod.example.portal`:
  portal routing and portal API example
- `modules/mod.example.suite`:
  broader source-host runtime example

## Important Boundaries

- `proxy.ts` protects page-like traffic, not `/api/*`.
- Typed API auth comes from route metadata plus host API proxy wiring.
- BuildForm preflight has its own same-origin and access checks.
- Module pages and module APIs use dispatcher routes and manifest metadata.
- Theme or module templates may override `ui.form`, `ui.table`, and submit UI.

## Navigation Goal

This reference set should be good enough that a developer or agent can answer
most "how do I build this here?" questions without reconstructing the runtime
from source files first.
