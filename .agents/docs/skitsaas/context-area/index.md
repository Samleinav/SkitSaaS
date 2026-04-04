---
title: "Context Area"
sidebar_position: 0
---

# Context Area

This section is the Botble-style context-area layer for SkitSaaS. It exists so
frontend module routes and slot-based module embedding can be understood as a
real runtime contract, not as hidden behavior in `lib/modules/runtime.ts`.

## What This Section Covers

Use this section when the task is:

- giving a module its own frontend route
- exposing module UI into a host or theme page through `slotId`
- reasoning about frontend route access policy
- understanding frontend aliases versus canonical module routes

## Read Order

1. [Frontend Routing And Slots](./frontend-routing-and-slots.md)
2. `../routing-and-route-factories.md`
3. `../portal-and-module-api-examples.md`
4. `../modules-and-sdk-boundaries.md`

## Practical Rule

Separate these three ideas before implementing:

- frontend module page
- frontend alias
- frontend slot

They often work together, but they are not the same runtime surface.
