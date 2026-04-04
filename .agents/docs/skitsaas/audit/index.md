---
title: "Audit"
sidebar_position: 0
---

# Audit

This section is the Botble-style audit and governance layer for SkitSaaS. It
exists so documentation hygiene, evidence workflows, and SDK change tracking do
not live only in historical notes or old docs.

## What This Section Covers

Use this section when the task is:

- checking whether docs need to be updated in the same change
- preparing evidence for canary or release review
- deciding how to record an SDK gap or published SDK change
- keeping shared docs and module-owned docs in the right place

## Read Order

1. [Documentation And Evidence](./documentation-and-evidence.md)
2. [SDK Change Log Policy](./sdk-change-log-policy.md)
3. `../operations/validation-and-canary.md`
4. `../reference/env-and-runtime-config.md`

## Practical Rule

If a task changes a shared contract, you usually need to update three things in
the same slice:

- the runtime or SDK code
- the human docs
- the agent docs or skills entry path
