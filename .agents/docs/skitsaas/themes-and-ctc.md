---
title: "Themes And CTC"
sidebar_position: 0
---

# Themes And CTC

SkitSaaS UI is not just "render a component from `components/ui`".

Admin, dashboard, frontend, and module UIs can pass through the Component
Template Controller, or CTC.

## What CTC Does

CTC resolves which template should render a component based on:

- core defaults
- theme overrides
- module defaults
- module overrides
- area context

Key files:

- `lib/templates/*`
- `components/ui/template-build-form.tsx`
- `components/ui/template-table.tsx`
- `lib/templates/ui-form.ts`
- `lib/templates/ui-table.ts`

## High-Value Component IDs

The most important current component IDs for agent work are:

- `ui.form`
- `ui.table`
- `ui.async-submit-button`
- `ui.alert-dialog`

## Why Agents Miss This

An agent sees `components/ui/build-form.tsx` or `components/ui/data-table.tsx`
and assumes that is the whole rendering system.

In practice:

- the SDK can bridge into host renderers
- the host can resolve `ui.form` and `ui.table` payloads
- modules can contribute template defaults or overrides
- themes can change the final template choice by area

## Resolution Order

Default template priority is theme-oriented, but the runtime can switch the
precedence depending on flags.

The important thing to remember is simple:

- module override can beat theme
- theme can beat core
- module default can still provide the baseline when a theme does not

## Theme And Area Assets

Theme packs control area assets such as:

- global CSS
- area CSS
- additional scripts
- not-found templates by area

That means UI work in admin or dashboard may be affected by theme selection even
if the React code looks shared.

## Practical Rule

If you are touching:

- forms
- tables
- confirm dialogs
- submit buttons
- area shell rendering

check whether the surface uses CTC or theme assets before hardcoding host UI.

## Common Mistakes

- assuming a component is purely local when it is template-resolved
- ignoring area context when changing form or table behavior
- documenting a UI path that only works when a theme override is absent
