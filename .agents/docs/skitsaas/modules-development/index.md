---
title: "Modules Development"
sidebar_position: 0
---

# Modules Development

This section is the Botble-style navigation layer for module authoring in
SkitSaaS. It intentionally repeats some information from the main SkitSaaS docs
so a developer or agent can stay inside one module-focused path without jumping
across unrelated sections.

## What This Section Covers

Use this section when the task is:

- starting a new module
- choosing `source-host` vs `source-package`
- wiring admin and dashboard pages
- exposing a module API
- using BuildForm or BuildTable inside a module
- adding DB migrations, config, or i18n
- preparing the module for validation and release

## Read Order

1. [Getting Started](./getting-started.md)
2. [Pages, Routing, and API](./pages-routing-and-api.md)
3. [Permissions and Actions](./permissions-and-actions.md)
4. [Navigation, Widgets, and Notifications](./navigation-widgets-and-notifications.md)
5. [UI, Forms, and Tables](./ui-forms-and-tables.md)
6. [Data, Config, and I18n](./data-config-and-i18n.md)
7. [Module Ops Runbook](./ops-runbook.md)
8. [Testing and Release](./testing-and-release.md)
9. [Source-Package Worked Example](./source-package-worked-example.md)
10. [Source-Host Worked Example](./source-host-worked-example.md)
11. [Composite Module Worked Example](./composite-module-worked-example.md)

## Canonical Example Modules

Use these examples first:

- `modules/mod.example.package`
  complete `source-package` example
- `modules/mod.example.api`
  typed `apiRoutes` example
- `modules/mod.example.portal`
  portal example
- `modules/mod.example.suite`
  larger source-host example

## Related Main Docs

If you need the broader runtime context, also read:

- `../modules-and-sdk-boundaries.md`
- `../module-starter-playbook.md`
- `../portal-and-module-api-examples.md`
- `../routing-and-route-factories.md`
