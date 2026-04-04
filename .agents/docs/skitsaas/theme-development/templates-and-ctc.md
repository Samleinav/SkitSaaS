---
title: "Theme Templates And CTC"
sidebar_position: 0
---

# Theme Templates And CTC

This page explains the heart of theme customization in SkitSaaS: the Component
Template Controller.

## What CTC Resolves

CTC decides which template wins based on:

- core defaults
- theme overrides
- module defaults
- module overrides
- area context

## High-Value Component IDs

The most important current component IDs are:

- `ui.form`
- `ui.table`
- `ui.alert-dialog`
- `ui.async-submit-button`
- `ui.user-menu`

## Why Themes Need This

Without CTC, a theme would only be CSS over fixed host components.
With CTC, a theme can actually influence the rendered template contract.

## Theme Pack Integration

Themes can expose template entries through their pack metadata.

That lets the runtime register:

- global templates
- area-specific templates

The runtime then resolves the winning template based on the current area and
context.

## Registration Shape

There are two useful ways to think about theme template registration:

- code-driven templates under `templates/*.tsx`
- optional explicit metadata in `templates.json`

The practical filename rule is important:

- `templates/ui.table.tsx` maps to `componentId: "ui.table"`
- `templates/ui.user-menu.tsx` maps to `componentId: "ui.user-menu"`
- `templates/admin/page.admin.home.tsx` maps to `componentId: "page.admin.home"`

For module-scoped theme overrides, keep the module ID in the filename, for
example:

- `templates/mods/billing/page.billing.invoices.tsx`

That keeps theme overrides readable and avoids collisions with core template
IDs.

## Module Interaction

Theme authors need to remember that modules can also ship template defaults or
overrides.

So the question is not just "what template does the theme want?" but also:

- is there a module override?
- is this component lockable?
- does module priority or theme priority win?

## Practical Rule

If the work touches:

- forms
- tables
- submit buttons
- confirm dialogs
- user menu or notification center

check the relevant CTC component IDs before assuming CSS-only changes are enough.

## Common Mistakes

- assuming a shared UI component is not template-resolved
- forgetting that modules can participate in template selection
- documenting theme behavior without saying which component ID it overrides
