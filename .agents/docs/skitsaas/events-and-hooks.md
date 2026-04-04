---
title: "Events And Hooks"
sidebar_position: 0
---

# Events And Hooks

SkitSaaS includes a generic event bus that works across core code and enabled
modules.

## Main Files

- `lib/events/catalog.ts`
- `lib/events/types.ts`
- `lib/events/registry.ts`
- `lib/events/bus.ts`
- `lib/events/queue.ts`
- `lib/events/logging.ts`

## Runtime Model

The event bus supports two execution styles:

- inline: `emitEvent(...)`
- async with queue fallback: `emitEventAsync(...)`

If queueing is unavailable, async emit falls back to inline execution.

## Module Integration

Modules can register handlers in their manifest with:

- hook name
- handler id
- priority
- `run(payload, context)`

Only enabled modules contribute handlers.

## Logging

Event emits and handler runs are logged to system activity logs, which means
the event bus is not just a fire-and-forget abstraction.

This matters for:

- auditability
- debugging
- operational visibility

## Naming Conventions

- use existing hook names from the catalog when they fit
- namespace custom module hooks under `mod.<moduleId>.*`
- prefer stable, domain-oriented names rather than UI-only wording

## Queue Processing

Queued events can be processed in batches through the queue processor.

The queue is optional infrastructure. The platform still works without Redis,
but the execution mode changes.

## Common Mistakes

- assuming async emit requires Redis to work at all
- forgetting that payload and context become part of the operational trace
- adding cross-module behavior without checking whether a hook already exists

## Related Docs

- `./hooks/index.md`
- `./hooks/emitters-checklist.md`
- `./notifications-and-delivery.md`
