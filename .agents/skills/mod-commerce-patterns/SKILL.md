---
name: mod-commerce-patterns
description: Build commerce-specific module features like product catalogs, one-time payments, or order management. Use this skill when a module handles product listings, purchase flows, or integrates with payment events via SDK.
---

# mod-commerce-patterns

## Scope

Commerce module patterns: product catalog, one-time payments, order management, and payment event integration via `eventHandlers`. SDK-only — no host payment/Stripe imports.

## Required References

- `docs/modules/15-commerce-products.md` — product catalog patterns
- `docs/modules/16-commerce-one-time-payments.md` — one-time payment flow
- `docs/subscriptions/payment-events-lifecycle.md` — payment event hooks (for event handler integration)
- `docs/subscriptions/features-and-quotas.md` — feature/quota patterns (host-side; SDK gap exists for module access — see `mod-routing-api-permissions`)

## Boundary Rules

Commerce modules follow the same rules as all `mod-*` skills:

```
FORBIDDEN:
  @/lib/payments/*
  @/lib/stripe/*
  stripe SDK imported directly in module code (use host payment events instead)
  getDashboardFeatureController (host-only — SDK gap, see mod-routing-api-permissions)

ALLOWED:
  eventHandlers in manifest for payment hook subscriptions
  @skitsaas/sdk/server for DB queries on module-owned tables
  notifyTeam / notifyUser for order confirmation notifications
```

## Payment Event Integration

Modules react to payment events via `eventHandlers`, not by importing Stripe or host payment utilities:

```ts
eventHandlers: [{
  id: 'mod.commerce.afterCheckout',
  hook: 'payment.checkout.completed',
  priority: 10,
  run: async (payload, context) => {
    // payload contains order data emitted by host checkout system
    const db = getAdminDb<any>();
    await db.insert(modCommerceOrders).values({ ... });
    await notifyUser(payload.userId, {
      title: 'Order confirmed',
      body: `Order #${payload.orderId} has been confirmed.`,
      area: 'dashboard'
    });
  }
}]
```

## Product Catalog Pattern

Module-owned product tables:

```
modules/mod.<id>/
  db/migrations/
    0001_create_products.sql   (mod_<id>_products table)
  src/
    data.ts    (getAdminDb queries)
    tables.ts  (defineBuildTable)
    forms.ts   (defineBuildForm for product create/edit)
    actions.ts ('use server' — createValidatedServerActionController)
```

## One-Time Payment Flow

One-time payments are initiated via the host checkout system. The module:
1. Creates a product record in its own table.
2. Emits a hook or listens to `payment.checkout.completed` to fulfill.
3. Does not directly call Stripe — the host checkout system owns that.

## Verification

```bash
rg -n "@/lib/payments|@/lib/stripe|stripe" modules/<moduleId>/src
# must return 0 matches
rg -n "from '@/|from \"@/" modules/<moduleId>/src
# must return 0 matches
pnpm exec tsc --noEmit
```
