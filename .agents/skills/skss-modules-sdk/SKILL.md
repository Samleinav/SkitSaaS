---
name: skss-modules-sdk
description: Use for module authoring, manifest design, dispatcher routes, SDK-first decisions, `source-host` vs `source-package`, and host adapter questions in SkitSaaS.
---

# skss-modules-sdk

## Read Order

1. `../../docs/skitsaas/modules-and-sdk-boundaries.md`
2. `../../docs/skitsaas/modules-development/index.md`
3. `../../docs/skitsaas/modules-development/permissions-and-actions.md`
4. `../../docs/skitsaas/modules-development/navigation-widgets-and-notifications.md`
5. `../../docs/skitsaas/modules-development/ops-runbook.md`
6. `../../docs/skitsaas/modules-development/source-package-worked-example.md`
7. `../../docs/skitsaas/modules-development/source-host-worked-example.md`
8. `../../docs/skitsaas/modules-development/composite-module-worked-example.md` for multi-surface module prompts
9. `../../docs/skitsaas/sdk/index.md`
10. `../../docs/skitsaas/module-starter-playbook.md`
11. `../../docs/skitsaas/routing-and-route-factories.md`
12. `../../docs/skitsaas/portal-and-module-api-examples.md` when APIs or portals are involved

## Verify In Code Only If Needed

- `app/sdk/src/modules/manifest.ts`
- `lib/modules/runtime.ts`
- `lib/modules/sdk-server-bootstrap.ts`
- `modules/mod.example.package/README.md`
- `modules/mod.example.portal/README.md`

## Rules

- decide module mode before proposing imports
- use SDK-first even in `source-host`
- keep `source-package` SDK-only for host capabilities
- use dispatcher routes and manifest metadata, not manual route glue
- prefer typed `apiRoutes` for new modules unless the task is explicitly about
  the legacy router path

## Watch For

- host imports leaking into portable modules
- module APIs being documented like normal host APIs
- alias routes replacing the canonical dispatcher in explanations
