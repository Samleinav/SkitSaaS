---
title: "SDK"
sidebar_position: 0
---

# SDK

This section is the Botble-style SDK layer for SkitSaaS. It exists to explain
the public contract that modules should depend on before they reach for host
internals.

## What This Section Covers

Use this section when the task is:

- understanding what `@skitsaas/sdk` already exports
- deciding whether a module should use SDK or host imports
- migrating a `source-host` module toward cleaner SDK-first boundaries
- checking which package entrypoint a capability belongs to

## Read Order

1. [SDK Overview](./overview.md)
2. [SDK-First Migration](./sdk-first-migration.md)
3. `../modules-and-sdk-boundaries.md`
4. `../modules-development/source-package-worked-example.md`
5. `../modules-development/source-host-worked-example.md`

## Practical Rule

When the question is "can I do this through the SDK already?", start here
before opening host files.
