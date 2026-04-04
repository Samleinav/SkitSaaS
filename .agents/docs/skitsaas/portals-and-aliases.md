---
title: "Portals And Aliases"
sidebar_position: 0
---

# Portals And Aliases

Portals are one of the most distinctive runtime features in SkitSaaS.

## What A Portal Is

A portal is a named area served at `/<portalName>/*` with:

- its own layout
- its own page registry
- its own auth and role rules
- optional theme selection
- internal rewrite to an isolated dispatcher path

Portals are not just friendly aliases for frontend module pages.

## Request Path

Example:

```txt
/school/students/12
  -> proxy.ts
  -> portal prefix match
  -> proxy chain
  -> rewrite to /portal-internal/school/students/12
  -> app/(portal)/portal-internal/[...slug]/page.tsx
  -> portal runtime resolves the page
```

Key files:

- `app/sdk/src/routing/portal.ts`
- `proxy.ts`
- `app/(portal)/portal-internal/[...slug]/page.tsx`
- `lib/portals/runtime.tsx`
- `lib/portals/role-routing.ts`

## Authoring Split

Portal modules typically use two files:

- `routes.ts`
  edge-safe metadata such as `RoutePortal(...)` and `RouteApiPortal(...)`
- `portal-init.ts`
  Node.js-only page and layout registration

This split matters because the edge and the Node runtime do not share the same
safe import surface.

## Default Portal Redirects

Role-based redirect resolution currently prefers:

1. admin access -> `/admin`
2. matching `redirectRoles`
3. `isDefaultPortal: true`
4. fallback -> `/dashboard`

## Dashboard Portals

Portals can also live under dashboard-prefixed URLs depending on registration
and area context. The runtime tracks portal prefixes separately so the proxy can
decide when to rewrite.

## How Portals Differ From Aliases

| Concept | What it does |
|---|---|
| module alias | friendly path that still resolves through normal module page dispatch |
| portal | independent area with its own layout and internal dispatcher |

Use aliases when you want a nicer URL for a normal module surface.
Use portals when you want a dedicated experience that should not inherit the
marketing layout or the normal area shell.

## Alias Rules Worth Remembering

- aliases must stay inside their area
- frontend aliases cannot collide with core frontend routes
- admin/dashboard aliases cannot collide with core admin/dashboard routes
- alias validation failures should be treated as release blockers

## Common Mistakes

- treating portal pages as frontend aliases
- importing Node-only registration code into edge route metadata files
- forgetting that `/portal-internal/*` is intentionally blocked from direct access
