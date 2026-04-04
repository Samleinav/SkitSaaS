---
title: "AI Assistant Guide"
sidebar_position: 0
---

# AI Assistant Guide

This page exists to stop the most common failure mode in this repo:
an agent starts coding before it has identified which runtime surface and which
platform primitive it should be using.

## Default Workflow

1. Identify the surface:
   `admin`, `dashboard`, `frontend`, `portal`, `core API`, or `module API`.
2. Identify the boundary:
   core route, module route, portal route, server action, typed API route,
   module manifest, theme/CTC, or platform service.
3. Check whether SkitSaaS already has a platform helper:
   BuildForm, BuildTable, route factory, proxy chain, feature controller,
   module runtime, notification helper, event bus.
4. Read the matching page in `.agents/docs/skitsaas/`.
5. Only then inspect the minimum source files needed to confirm reality.

## Read Order By Task

| Task | Read order |
|---|---|
| General onboarding | `getting-started/index.md` -> `index.md` -> `source-code-structure.md` -> `request-lifecycle.md` |
| Login, redirects, route helpers, aliases | `routing-and-route-factories.md` -> `proxies-and-api-security.md` |
| Frontend module routes or host/theme slots | `context-area/index.md` -> `context-area/frontend-routing-and-slots.md` -> `routing-and-route-factories.md` |
| Platform capabilities, env, DB ownership, i18n runtime, SDK tracking | `reference/index.md` -> `reference/platform-capabilities.md` -> `reference/env-and-runtime-config.md` -> `reference/sdk-change-log.md` |
| Security model, tenant isolation, auth-provider extension | `security/index.md` -> `security/rls-and-tenant-isolation.md` -> `security/auth-provider-spi.md` -> `proxies-and-api-security.md` |
| Logs, admin dashboard runtime, email delivery, smoke or canary workflow | `operations/index.md` -> `operations/admin-dashboard.md` -> `operations/system-activity-and-audit-logs.md` -> `operations/validation-and-canary.md` |
| Documentation hygiene, evidence, or SDK change tracking | `audit/index.md` -> `audit/documentation-and-evidence.md` -> `audit/sdk-change-log-policy.md` |
| Subscription lifecycle or dashboard subscription UX | `subscriptions/index.md` -> `subscriptions/payment-lifecycle.md` -> `subscriptions/dashboard-management.md` -> `subscriptions-and-features.md` |
| Forms or mutations | `forms-and-validation.md` -> `admin-crud-playbook.md` -> `themes-and-ctc.md` |
| Tables, list views, CRUD grids | `datatables-and-remote-actions.md` -> `admin-crud-playbook.md` -> `themes-and-ctc.md` |
| Modules or SDK boundaries | `modules-development/index.md` -> `modules-development/permissions-and-actions.md` -> `modules-development/navigation-widgets-and-notifications.md` -> `modules-development/ops-runbook.md` -> `modules-development/source-package-worked-example.md` -> `modules-development/source-host-worked-example.md` -> `modules-development/composite-module-worked-example.md` -> `module-starter-playbook.md` -> `modules-and-sdk-boundaries.md` |
| SDK surface or migration work | `sdk/index.md` -> `sdk/overview.md` -> `sdk/sdk-first-migration.md` |
| Portals | `portals-and-aliases.md` -> `portal-and-module-api-examples.md` -> `routing-and-route-factories.md` |
| Theme work | `theme-development/index.md` -> `theme-development/build-time-selection-and-adr.md` -> `theme-development/template-precedence-and-locking.md` -> `theme-development/theme-pack-worked-examples.md` -> `theme-development/backoffice-override-worked-example.md` -> `theme-development/override-catalog.md` -> `themes-and-ctc.md` |
| Hooks, queues, emitters | `hooks/index.md` -> `events-and-hooks.md` -> `hooks/emitters-checklist.md` -> `notifications-and-delivery.md` -> `checkout-side-effects-playbook.md` |
| Features, quotas, billing-driven permissions | `subscriptions-and-features.md` |

## Source Of Truth Order

Use this trust order when something conflicts:

1. `.agents/docs/skitsaas/*` for the curated task map
2. `app/sdk/src/*` for public contracts
3. `lib/*` and `app/*` host runtime files
4. canonical example modules
5. older docs and older skills

## Canonical Files To Verify

| Topic | Files |
|---|---|
| Area routing | `app/sdk/src/routing/area.ts`, `lib/routing/area-setup.ts` |
| Page proxy flow | `proxy.ts`, `lib/routing/proxies.ts` |
| Tenant DB split | `lib/db/drizzle.ts`, `lib/db/with-user-context.ts`, `lib/db/queries.admin.ts` |
| Typed API routes | `app/sdk/src/routing/api-route.ts`, `lib/routing/with-api-route.ts` |
| BuildForm | `app/sdk/src/forms.ts`, `app/sdk/src/form-validation.ts`, `lib/forms/*`, `components/ui/build-form.tsx` |
| BuildTable | `app/sdk/src/datatables/*`, `components/ui/data-table.tsx` |
| Module runtime | `app/sdk/src/modules/manifest.ts`, `lib/modules/runtime.ts`, `lib/modules/sdk-server-bootstrap.ts` |
| Portals | `app/sdk/src/routing/portal.ts`, `app/(portal)/portal-internal/[...slug]/page.tsx`, `lib/portals/runtime.tsx` |
| Templates and theming | `lib/templates/*`, `themes/*`, `components/ui/template-build-form.tsx` |
| Event bus | `lib/events/*` |
| Features and quotas | `lib/features/*`, `lib/quota/*`, `lib/modules/sdk-server-bootstrap.ts` |
| Auth provider SPI | `app/sdk/src/modules/manifest.ts`, `lib/modules/runtime.ts`, `app/api/auth/providers/*`, `lib/auth/provider-handoff.ts` |
| Ops logs and email audit | `lib/system/activity-logs.ts`, `lib/db/schema.ts`, `app/(dashboard)/admin/logs/page.tsx` |

## Common Mistakes To Avoid

- Do not assume `/api/*` is protected by `proxy.ts`.
- Do not assume page access guard is enough for server actions.
- Do not build a custom form before checking BuildForm and the controller
  registry.
- Do not build a custom grid before checking BuildTable or the host table
  adapter.
- Do not teach `source-package` modules to import `@/lib/*`, `@/app/*`, or
  `@/components/*`.
- Do not ignore theme and CTC resolution when working on admin/dashboard UI.
- Do not join billing tables directly inside module code when SDK helpers exist.

## Quick Decision Rules

- Need a URL helper:
  start with route factories.
- Need page protection:
  think proxy chain.
- Need API protection:
  think typed API route metadata or module API contract.
- Need a CRUD form:
  think BuildForm, validated actions, template resolution, and the CRUD playbook.
- Need a list view:
  think BuildTable, `DataTable`, and the CRUD playbook.
- Need cross-module behavior:
  think event bus, notifications, and whether the action should stay direct or move into an event handler.
- Need plan-aware behavior:
  think feature controller or quota SDK helpers.
