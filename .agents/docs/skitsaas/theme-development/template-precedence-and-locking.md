---
title: "Template Precedence And Locking"
sidebar_position: 0
---

# Template Precedence And Locking

Use this page when the task is not just "which component ID exists?" but "which
template actually wins, and why?"

## Main Files

- `lib/templates/catalog.ts`
- `lib/templates/contract.ts`
- `lib/templates/controller.ts`
- `lib/templates/runtime.ts`
- `lib/templates/theme-pack.ts`
- `lib/templates/module-pack.ts`

## Contract Version

Current host template contract:

- `1.0.0`

Compatibility formats accepted today:

- exact version like `1.0.0`
- caret range like `^1.0.0`
- wildcard `*`

That compatibility is enforced when template packs are registered.

## Component ID Rules

`componentId` must use lowercase dot/kebab segments.

Examples:

- `ui.form`
- `ui.table`
- `ui.alert-dialog`
- `ui.async-submit-button`

The current pilot catalog in `lib/templates/catalog.ts` treats these as the
main built-in IDs:

- `ui.form`
- `ui.table`
- `ui.alert-dialog`
- `ui.async-submit-button`

Current lockable component IDs:

- `ui.alert-dialog`
- `ui.async-submit-button`

## Resolution Sources

CTC can resolve a template from these sources:

- `module_override`
- `theme_area_override`
- `theme_global_override`
- `module_default`
- `core_default`
- `fallback`

## Default Precedence

If backoffice priority is theme-oriented, the resolver order is:

1. `module_override`
2. `theme_area_override`
3. `theme_global_override`
4. `module_default`
5. `core_default`
6. `fallback`

## Module-Oriented Precedence

If the runtime chooses module priority, the order becomes:

1. `module_override`
2. `module_default`
3. `theme_area_override`
4. `theme_global_override`
5. `core_default`
6. `fallback`

## How Priority Is Chosen

`resolveTemplateForArea(...)` in `lib/templates/runtime.ts` applies:

- `THEME_TEMPLATE_PRIORITY` for `admin` and `dashboard`
- always `theme` priority for `frontend`

This is why backoffice behavior can change without changing the component
itself.

## `lockTemplate`

`lockTemplate` is mainly a module-pack control for lockable component IDs.

If a module template sets `lockTemplate=true` and the component is lockable:

- theme overrides are ignored by default
- the module-owned template keeps control
- `adminForceOverride=true` is the explicit escape hatch

Practical reading:

- modules can protect critical submit/confirm surfaces
- themes still style most UI, but some module-owned behavior can stay
  authoritative

## Theme Pack Rules

Theme template packs can contribute:

- area templates (`admin`, `dashboard`, `frontend`)
- global templates as fallback after area lookup

Validation rules in `lib/templates/theme-pack.ts` reject:

- invalid areas
- invalid `componentId` format
- duplicate `componentId` entries within one area
- incompatible contract ranges

## Debugging

When template debug metadata is enabled, runtime output can expose:

- `data-template-component`
- `data-template-id`
- `data-template-source`

That makes it easier to answer:

- which template won
- whether the winner came from core, theme, or module
- whether the expected override actually applied

## Practical Rule

If a UI change seems ignored:

1. confirm the `componentId`
2. confirm the area
3. check whether a module template pack is present
4. check whether the component is lockable
5. confirm current backoffice priority and theme selection

## Common Mistakes

- assuming CSS is enough when a component is template-resolved
- forgetting that `module_default` can beat a theme under module-priority mode
- trying to reason about admin/dashboard rendering without checking
  `THEME_TEMPLATE_PRIORITY`
- ignoring debug metadata when the winning template is unclear

## Related Docs

- `./templates-and-ctc.md`
- `./override-catalog.md`
- `./build-time-selection-and-adr.md`
