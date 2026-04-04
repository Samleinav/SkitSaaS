---
name: skss-foundation
description: Start here for any SkitSaaS task. Uses the active docs reference set to identify the runtime surface, choose the right docs first, and avoid missing built-in platform helpers.
---

# skss-foundation

Use this skill whenever the task touches SkitSaaS and there is any risk of
forgetting existing platform primitives.

## Read Order

1. `../../docs/skitsaas/getting-started/index.md`
2. `../../docs/skitsaas/index.md`
3. `../../docs/skitsaas/ai-assistant-guide.md`
4. `../../docs/skitsaas/source-code-structure.md`
5. the task-specific page from `index.md`

## Task Map

- routes, auth flow, aliases:
  `routing-and-route-factories.md`
- frontend module routes and slots:
  `context-area/index.md`
- proxies, page vs API security:
  `proxies-and-api-security.md`
- platform manual, env, DB, i18n:
  `reference/index.md`
- sdk changelog workflow:
  `reference/sdk-change-log.md`
- security model and auth extension points:
  `security/index.md`
- logs, SMTP, smoke/canary operations:
  `operations/index.md`
- admin dashboard runtime:
  `operations/admin-dashboard.md`
- docs hygiene and sdk change tracking:
  `audit/index.md`
- forms and validation:
  `forms-and-validation.md`
- end-to-end CRUD:
  `admin-crud-playbook.md`
- tables and CRUD lists:
  `datatables-and-remote-actions.md`
- theme or template-aware UI:
  `themes-and-ctc.md`
- modules and SDK boundaries:
  `modules-and-sdk-boundaries.md`
- new module starter:
  `module-starter-playbook.md`
- botble-style module docs:
  `modules-development/index.md`
- module permissions and action boundaries:
  `modules-development/permissions-and-actions.md`
- worked `source-package` starter:
  `modules-development/source-package-worked-example.md`
- worked `source-host` starter:
  `modules-development/source-host-worked-example.md`
- worked composite module slice:
  `modules-development/composite-module-worked-example.md`
- botble-style theme docs:
  `theme-development/index.md`
- worked theme pack examples:
  `theme-development/theme-pack-worked-examples.md`
- worked backoffice override flow:
  `theme-development/backoffice-override-worked-example.md`
- sdk public surface:
  `sdk/index.md`
- subscription lifecycle and dashboard management:
  `subscriptions/index.md`
- hooks and events:
  `hooks/index.md`
- persisted notifications:
  `notifications-and-delivery.md`
- plan features and quotas:
  `subscriptions-and-features.md`

## Working Rules

- identify the runtime surface before exploring code
- prefer platform helpers over custom implementations
- treat `app/sdk/src/*` as the public contract
- inspect source only after the docs pass tells you which files matter
- if the task asks "how do I actually build this?", prefer the playbook/example
  docs before jumping to code

## Common Failure Modes

- assuming `/api/*` is protected by `proxy.ts`
- forgetting BuildForm or BuildTable already exists
- mixing `source-host` and `source-package` boundaries
- ignoring theme and CTC resolution on admin/dashboard UI
