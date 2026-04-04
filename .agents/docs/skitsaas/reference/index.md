---
title: "Platform Reference"
sidebar_position: 0
---

# Platform Reference

This section is the Botble-style reference layer for SkitSaaS. It is the place
to read when the question is not "how do I build one feature?" but "what does
the host platform already provide and where does it live?"

## What This Section Covers

Use this section when the task is:

- understanding host capabilities before choosing an implementation path
- mapping a runtime behavior to its main files, routes, APIs, and tables
- checking which tables are core-owned versus module-owned
- verifying how env variables override DB-backed runtime config
- understanding the current i18n runtime and its flat-vs-typed split

## Read Order

1. [Platform Capabilities](./platform-capabilities.md)
2. [Database Model](./database-model.md)
3. [Env And Runtime Config](./env-and-runtime-config.md)
4. [I18n Runtime](./i18n-runtime.md)
5. [SDK Change Log Reference](./sdk-change-log.md)

## Related Main Docs

For task-oriented docs, also read:

- `../source-code-structure.md`
- `../request-lifecycle.md`
- `../modules-and-sdk-boundaries.md`
- `../themes-and-ctc.md`
- `../subscriptions-and-features.md`

## Practical Rule

If the question starts with one of these patterns, start here first:

- "does the platform already support..."
- "which table owns..."
- "what env variable controls..."
- "what is the source of truth for..."
- "which runtime service handles..."
