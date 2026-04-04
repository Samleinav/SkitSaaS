---
title: "Theme Override Catalog"
sidebar_position: 0
---

# Theme Override Catalog

Use this page when the task is not just "how does CTC work?" but "which
`componentId` values can I realistically override in this repo right now?"

This page is intentionally practical. It focuses on the current overrideable
surface that theme authors and agents are likely to touch first.

## How To Read This Catalog

Use this mapping rule first:

- `templates/ui.table.tsx` -> `ui.table`
- `templates/ui.user-menu.tsx` -> `ui.user-menu`
- `templates/admin/page.admin.home.tsx` -> `page.admin.home`
- `templates/dashboard/layout.dashboard.shell.tsx` -> `layout.dashboard.shell`

The file path is the fastest mental model for the `componentId`.

## High-Value Global UI IDs

These are the most important cross-area template IDs:

- `ui.form`
- `ui.table`
- `ui.table.control`
- `ui.alert-dialog`
- `ui.async-submit-button`
- `ui.dialog`
- `ui.user-menu`
- `ui.language-switcher`
- `ui.theme-toggle`
- `ui.checkout.payment-method-selector`

Use these first when the work changes reusable UI behavior rather than one
specific page.

## High-Value Layout IDs

These template IDs shape the private shell:

- `layout.private.shell`
- `layout.private.header`
- `layout.admin.shell`
- `layout.admin.app-config.shell`
- `layout.dashboard.shell`

Use these when the work changes navigation chrome, shell structure, or
backoffice framing rather than page body content.

## Login And System IDs

Current login/system overrides include:

- `page.login.admin`
- `page.login.user`
- `page.login.signup`
- `page.login.forgot-password`
- `page.login.reset-password`
- `system.not-found`

These are useful when the work changes auth or fallback screens without
touching admin/dashboard app shells.

## Admin Page IDs

Current admin pages with explicit theme templates include examples such as:

- `page.admin.home`
- `page.admin.users`
- `page.admin.user.detail`
- `page.admin.payments`
- `page.admin.orders`
- `page.admin.orders.create`
- `page.admin.orders.edit`
- `page.admin.subscriptions.create`
- `page.admin.subscriptions.edit`
- `page.admin.subscriptions.templates`
- `page.admin.app-config.home`
- `page.admin.app-config.general`
- `page.admin.app-config.email`
- `page.admin.app-config.modules`
- `page.admin.app-config.payment-methods`
- `page.admin.app-config.theme`
- `page.admin.logs`

Practical rule:

- if the change is one concrete admin screen, prefer the page-level template
- if the change should affect many screens, prefer layout or global UI IDs

## Dashboard Page IDs

Current dashboard page examples include:

- `page.dashboard.home`
- `page.dashboard.general`
- `page.dashboard.activity`
- `page.dashboard.activity.loading`
- `page.dashboard.security`
- `page.dashboard.subscriptions`

These are especially useful for dashboard-specific shell or subscription
presentation work.

## Admin Section IDs

Current backoffice themes also override granular admin sections such as:

- `section.admin.nav`
- `section.admin.breadcrumb`
- `section.admin.metrics-grid`
- `section.admin.dashboard.overview`
- `section.admin.dashboard.quick-links`
- `section.admin.dashboard.recent-activity`
- `section.admin.dashboard.module-widget`
- `section.admin.app-config-nav`
- `section.admin.app-config-nav.item`
- `section.admin.app-config-nav.panel`

Some themes also include extra metrics sections such as:

- `section.admin.orders.metrics`
- `section.admin.payments.metrics`
- `section.admin.subscriptions.metrics`
- `section.admin.users.metrics`

Use these when the work is too specific for page-level overrides but broader
than one reusable global UI primitive.

## Table Cell IDs

The current theme surface includes granular table cell templates such as:

Admin:

- `section.admin.table.logs.cell`
- `section.admin.table.orders.cell`
- `section.admin.table.payments.cell`
- `section.admin.table.subscriptions.cell`
- `section.admin.table.subscriptions.templates.cell`
- `section.admin.table.suscriptions.user.cell`
- `section.admin.table.users.cell`

Dashboard:

- `section.dashboard.table.subscriptions.invoices.cell`
- `section.dashboard.table.subscriptions.organizations.cell`
- `section.dashboard.table.subscriptions.payments.cell`

Use these when only one table cell family should change, not the entire table.

## Choosing The Right Override Level

Use this rule:

- want to change all tables:
  start with `ui.table`
- want to change only table controls:
  use `ui.table.control`
- want to change one admin table cell family:
  use `section.admin.table.*.cell`
- want to change one screen:
  use `page.*`
- want to change whole shell framing:
  use `layout.*`

## Current Real Theme Packs

Good reference packs:

- `themes/first-backoffice`
- `themes/nexustheme`

Those two packs show the current naming surface most clearly.

## Common Mistakes

- overriding a full page when a reusable `ui.*` template was the real target
- changing `ui.table` when only one cell family should change
- assuming the file name is arbitrary instead of following the `componentId`
  contract

## Related Docs

- `./templates-and-ctc.md`
- `./theme-pack-worked-examples.md`
- `../themes-and-ctc.md`
