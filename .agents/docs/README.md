---
title: "docs"
sidebar_position: 0
---

# docs

Active documentation workspace for the new SkitSaaS reference structure.

Start here:

- `.agents/docs/skitsaas/index.md`
- `.agents/docs/skitsaas/ai-assistant-guide.md`
- `.agents/docs/skitsaas/sidebar.ts`

The human/web documentation lives under `docs/`. The pages under
`.agents/docs/skitsaas/*` are the active operational reference layer that the
`.agents` skills should read first.

## Documentation Sync Policy

Treat documentation in this repository as two synchronized tracks:

- human/web docs:
  the main Docusaurus-facing documentation under `docs/`
- agent docs:
  the operational reference set under `.agents/docs/skitsaas/*`

When platform behavior, architecture, routes, SDK contracts, modules, themes,
operations, or feature/quota rules change, update both tracks in the same task.

Use this rule of thumb:

- human docs explain the system for developers and operators
- agent docs optimize for execution with read order, playbooks, and worked examples

Do not update one track and leave the other stale. If a change intentionally
belongs to only one track, state that explicitly in the same task.
