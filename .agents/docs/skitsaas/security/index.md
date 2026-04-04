---
title: "Security"
sidebar_position: 0
---

# Security

This section is the Botble-style security layer for SkitSaaS. It exists so the
security model is not scattered only across routing docs and source files.

## What This Section Covers

Use this section when the task is:

- understanding request trust boundaries
- deciding how dashboard/frontend data should respect tenant isolation
- working with module-owned auth providers
- clarifying what stays in core versus what modules can extend

## Read Order

1. [RLS And Tenant Isolation](./rls-and-tenant-isolation.md)
2. [Auth Provider SPI](./auth-provider-spi.md)
3. `../proxies-and-api-security.md`
4. `../request-lifecycle.md`

## Related Main Docs

- `../routing-and-route-factories.md`
- `../portals-and-aliases.md`
- `../modules-and-sdk-boundaries.md`

## Practical Rule

When a task touches auth or permissions, separate these concerns first:

- page access
- API access
- server action guards
- DB isolation
- provider integration
