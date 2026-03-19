---
title: Module Development Index
sidebar_position: 1
description: Navigation entrypoint for host module runtime contracts and SDK module surfaces, with source-host as the primary strategy.
---

# Module Development Index

Use this section to navigate host module surfaces (module runtime + SDK). In this repository, new modules should default to `source-host`; `source-package` remains an advanced secondary path.

Ownership rule:

- Host/runtime contracts stay under `docs/modules/*` and `docs/sdk/*`.
- Module-specific implementation and operational docs stay outside `docs/`, in each module directory (`modules/<moduleId>/README.md`, optional `modules/<moduleId>/docs/*`).

Primary references:

- `docs/modules/00-overview.md`
- `docs/sdk/00-overview.md`
- `docs/forms/02-sdk-vs-source-host.md`

Recommended reading order:

1. `docs/modules/00-overview.md`
2. `docs/modules/01-manifest-registry.md`
3. `docs/modules/02-runtime-routing.md`
4. `docs/modules/03-permissions-actions.md`
5. `docs/modules/04-database-migrations.md`
6. `docs/modules/05-config.md`
7. `docs/modules/06-nav-widgets.md`
8. `docs/modules/07-api-modules.md`
9. `docs/themes/01-theme-runtime.md`
10. `docs/modules/09-testing.md`
11. `docs/modules/10-ops-runbook.md`
12. `docs/modules/12-i18n.md` (flat translator contract, locale publication, and `languagePack` provider metadata)
13. `docs/modules/13-source-package-template.md` (advanced / secondary)
14. `docs/themes/03-template-controller.md`
15. `docs/themes/02-theme-authoring-guide.md`
