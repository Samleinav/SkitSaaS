---
title: "SDK Change Log Reference"
sidebar_position: 0
---

# SDK Change Log Reference

Use this page when the task changes a public SDK contract and you need to keep
an operational memory of what moved, why it moved, and whether publication work
is still pending.

## What This Page Is For

The SDK docs describe the intended contract.

The SDK change log records:

- why a contract change happened
- which module or core slice triggered it
- which public surface changed
- whether the change is already published or still pending

That keeps module unblock work from disappearing once the coding task is done.

## What Counts As A Change Log Entry

Record an entry when a task:

- adds a new export to `@skitsaas/sdk`, `@skitsaas/sdk/server`, or
  `@skitsaas/sdk/db`
- changes manifest fields or runtime semantics exposed publicly
- closes an SDK gap discovered during module work
- adds migration expectations that future module authors need to know

## Suggested Entry Shape

```md
## YYYY-MM-DD - <short-id>

- `status`: pending_publish | published
- `module`: mod.something | core
- `type`: gap | change
- `summary`: short description
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server | @skitsaas/sdk/db
- `files`: key paths touched
- `notes`: context, migration impact, or behavior changes
```

## Minimal Documentation Bundle For An SDK Change

When the SDK changes, the work is not complete until all of these are updated:

1. the SDK source contract in `app/sdk/src/*`
2. the generated or distributed SDK output if the task includes publishing
3. the relevant task docs under `.agents/docs/skitsaas/`
4. a change log entry describing why the change happened

## Practical Rule

Do not use the change log as the only contract description.

Use it as the memory layer for:

- status
- motivation
- migration notes
- touched files

The actual contract still belongs in:

- `.agents/docs/skitsaas/sdk/*`
- module/runtime docs
- public package README or entrypoint docs when relevant

## Good Workflow

When a module task reveals an SDK gap:

1. record the gap
2. decide whether the current task should extend the SDK or keep a local
   workaround
3. if the SDK changes, update the public contract docs
4. capture the touched files and migration impact
5. mark publication state clearly

## Common Mistakes

- fixing a module pain point in the SDK without leaving any publication notes
- recording only a version bump with no explanation of contract impact
- documenting a runtime behavior change in the changelog but not in the SDK or
  module docs

## Related Docs

- `../sdk/overview.md`
- `../sdk/sdk-first-migration.md`
- `../audit/sdk-change-log-policy.md`
