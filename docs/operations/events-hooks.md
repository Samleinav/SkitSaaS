---
title: Events and Hooks
sidebar_position: 11
---

# Events and Hooks

This project includes a **generic events/hooks system** that runs across core
code and enabled modules. Handlers are registered in code (no DB registry).
Redis is optional: if Redis is unavailable, events run inline. Configure
`EVENTS_REDIS_URL` (or `REDIS_URL` as fallback) to enable the queue.

## Core files

- Types: `lib/events/types.ts`
- Hook catalog: `lib/events/catalog.ts`
- Registry: `lib/events/registry.ts`
- Bus: `lib/events/bus.ts`
- Redis queue: `lib/events/queue.ts`

## Register handlers in modules

Add handlers to your module manifest:

```ts
defineModule({
  moduleId: 'mod.analytics',
  version: '1.0.0',
  displayName: 'Analytics',
  eventHandlers: [
    {
      id: 'mod.analytics.afterCheckout',
      hook: 'checkout.after_create_order',
      priority: 10,
      run: async (payload, context) => {
        // payload is mutable by convention
        console.log('order created', payload, context);
      }
    }
  ]
});
```

Only **enabled** modules (from `app_modules`) contribute handlers.

## Naming conventions

- Area-specific hooks use prefixes like `admin.*` and `dashboard.*`.
- Auth/login hooks use `auth.*`.
- Custom hooks should be namespaced as `mod.<moduleId>.*` to avoid collisions.

## Admin app config sections

Use `admin.app_config.sections.compose` when modules need to extend the
configuration sections navigation under `/admin/app-config`.

## Emit events

Inline execution:

```ts
await emitEvent('checkout.before_create_order', orderDraft, {
  source: '/lib/payments/checkout-system',
  actorUserId,
  teamId
});
```

Async (Redis queue, falls back to inline if Redis is missing):

```ts
await emitEventAsync('checkout.after_create_order', order, {
  source: '/lib/payments/checkout-system'
});
```

## Queue processing (optional)

If you use Redis, run a worker/cron to process queued events:

```ts
await processEventQueue({ limit: 50 });
```

## Logging

All emits/handlers are logged to `sys_activity_logs` with:

- `eventCategory = 'event_bus'`
- `eventType = <hook>`
- metadata: `eventId`, `moduleId`, `handlerId`, `durationMs`, `error`

Logs are visible in `/admin/logs`.
