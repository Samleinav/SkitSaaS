---
title: "SDK Change Log Policy"
sidebar_position: 0
---

# SDK Change Log Policy

Use this page when a module task discovers an SDK gap or when a shared SDK
contract changes and needs traceable publication notes.

## Why This Exists

SDK changes are easy to lose when they are made only to unblock one module.

A lightweight SDK change log policy helps preserve:

- why the gap appeared
- what changed
- whether it is already published or still pending
- which SDK surface changed

## When To Record An Entry

Record an entry when:

- a module task reveals an SDK gap
- a public SDK contract is extended or changed
- a host/runtime slice adds new behavior behind an existing SDK contract
- a migration note matters for future module authors

## What To Record

A useful entry should include:

- date
- short id
- publication status
- affected module or core area
- change type
- short summary
- SDK surface
- key files
- notes about impact or migration

## Suggested Entry Shape

```md
## YYYY-MM-DD - <short-id>

- `status`: pending_publish | published
- `module`: mod.something | core
- `type`: gap | change
- `summary`: short description
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server | @skitsaas/sdk/db
- `files`: key paths touched
- `notes`: context and migration impact
```

## Practical Rule

The change log is not the source of truth for the full contract.

It is the operational memory for:

- publication state
- migration notes
- why the change happened

The current contract still belongs in:

- SDK docs
- module/runtime docs
- package README or public entrypoint docs when relevant

## Good Workflow

When an SDK gap appears:

1. record the gap
2. implement the change if it belongs in the current slice
3. update SDK docs
4. update related runtime or module docs
5. mark publication status clearly

## Common Mistakes

- changing the SDK without recording the reason or impact
- using the change log as the only place where the contract is described
- recording a module workaround without clarifying whether the SDK was actually
  extended

## Related Docs

- `../sdk/overview.md`
- `../sdk/sdk-first-migration.md`
- `./documentation-and-evidence.md`
