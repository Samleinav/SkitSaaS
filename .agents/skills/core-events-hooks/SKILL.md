---
name: core-events-hooks
description: Add, modify, or extend the platform event system. Use this skill when adding new event hooks to the catalog, wiring new emitters, modifying the event bus or queue, or reviewing module event handler registration.
---

# core-events-hooks

## Scope

Event catalog (`lib/events/catalog.ts`), bus (`lib/events/bus.ts`), Redis queue (`lib/events/queue.ts`), registry (`lib/events/registry.ts`), emitter coverage, and the `eventHandlers` contract in `ModuleManifest`.

## Required References

- `docs/hooks/01-events-hooks.md` — system overview, emitting events, queue processing, logging, naming conventions
- `docs/hooks/02-events-hooks-emitters.md` — living checklist of all emitter locations

## Core Files

| File | Purpose |
|------|---------|
| `lib/events/types.ts` | `EventHook`, `EventPayload`, `ModuleEventHandler`, `EventEmitContext` types |
| `lib/events/catalog.ts` | All registered hook names (`EVENT_HOOKS` constant) |
| `lib/events/registry.ts` | Handler registry built from enabled modules |
| `lib/events/bus.ts` | `emitEvent` / `emitEventAsync` implementations |
| `lib/events/queue.ts` | Redis-backed async queue + `processEventQueue` |

## Adding a New Event Hook

1. Add the hook name to `lib/events/catalog.ts` under the correct namespace prefix.
2. Add it to `EVENT_HOOKS` export in `app/sdk/src/index.ts` so modules can reference it.
3. Add an emitter call at the appropriate host location using `emitEvent` or `emitEventAsync`.
4. Update `docs/hooks/02-events-hooks-emitters.md` with the new emitter source location.

Hook naming convention:
- `area.action` (e.g., `checkout.after_create_order`, `admin.subscriptions.template.pricing_changed`)
- Custom module hooks: `mod.<moduleId>.<action>` (to avoid collisions)

## Emitting Events (Host Code)

```ts
import { emitEvent, emitEventAsync } from '@/lib/events/bus';

// Inline (sync within request):
await emitEvent('checkout.before_create_order', orderDraft, {
  source: '/lib/payments/checkout-system',
  actorUserId,
  teamId
});

// Async (Redis queue, falls back to inline if Redis unavailable):
await emitEventAsync('checkout.after_create_order', order, {
  source: '/lib/payments/checkout-system'
});
```

Redis config: `EVENTS_REDIS_URL` (or `REDIS_URL` fallback).

## Module Event Handlers

Modules register handlers in their manifest via `eventHandlers`. The host registry (`lib/events/registry.ts`) collects handlers from all enabled modules at runtime.

```ts
// modules/mod.<id>/src/manifest.ts
eventHandlers: [{
  id: 'mod.<id>.afterCheckout',
  hook: 'checkout.after_create_order',
  priority: 10,
  run: async (payload, context) => { ... }
}]
```

Only enabled modules contribute handlers (`app_modules.status='enabled'`).

## Logging

All emits and handler executions are logged to `sys_activity_logs`:
- `eventCategory = 'event_bus'`
- `eventType = <hook name>`
- metadata: `eventId`, `moduleId`, `handlerId`, `durationMs`, `error`

Visible at `/admin/logs`.

## Queue Processing

```ts
import { processEventQueue } from '@/lib/events/queue';
await processEventQueue({ limit: 50 });
```

Run as a cron/worker when Redis is configured.

## Verification

```bash
# Confirm all emitters are documented
rg -n "emitEvent|emitEventAsync" lib/ app/ --include="*.ts" --include="*.tsx"
# Compare against docs/hooks/02-events-hooks-emitters.md

pnpm exec tsc --noEmit
```
