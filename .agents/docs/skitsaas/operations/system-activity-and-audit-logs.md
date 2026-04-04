---
title: "System Activity And Audit Logs"
sidebar_position: 0
---

# System Activity And Audit Logs

Use this page when the task depends on traceability, evidence, or admin-facing
log inspection.

## Main Table

Primary audit table:

- `sys_activity_logs`

This is the cross-domain activity ledger for operational visibility.

## Write Paths

Important write sources include:

- auth events
- admin actions
- payment lifecycle events
- event bus emits and handlers
- module/runtime operations

Relevant files:

- `lib/system/activity-logs.ts`
- `lib/events/*`
- `lib/payments/*`

## Request Correlation

A good audit story depends on correlating related writes across one request or
workflow.

Practical rule:

- treat request correlation as part of operational observability, not as an
  optional extra

## High-Value Categories

Common activity families include:

- `auth`
- `admin`
- `payment`
- `event_bus`
- `module_runtime`

The exact category set can evolve, but these are the main operator-facing
families worth checking first.

## Indexing And Query Shape

The audit table is designed for operational lookup patterns such as:

- time-window queries
- actor-based review
- request-id correlation
- entity timeline review
- team-based filtering

## Admin Surface

Current admin UI:

- `/admin/logs`

Use that surface first for operational review before dropping into raw DB
queries.

## Practical Review Questions

When investigating an incident, ask:

1. did the event get logged at all?
2. which category and event type was written?
3. is there a request-id or entity correlation path?
4. is the actor or target identity present?

## Common Mistakes

- documenting a workflow without naming where its audit evidence lands
- assuming event bus logs and business-domain logs are the same thing
- treating admin logs as a debugging-only tool instead of an operational
  surface

## Related Docs

- `./validation-and-canary.md`
- `../events-and-hooks.md`
- `../notifications-and-delivery.md`
