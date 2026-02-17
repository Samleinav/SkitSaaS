---
title: Commerce One-Time Payments Module
sidebar_position: 17
---

# Commerce One-Time Payments Module

`mod.commerce.one-time-payments` is the backend module for one-time checkout intent orchestration.

Current stage is backend-only and supports Stripe + PayPal for checkout/webhook reconciliation.

## Module contract

- Module ID: `mod.commerce.one-time-payments`
- Mode: `source-host`
- Entry: `modules/mod.commerce.one-time-payments/src/manifest.ts`
- API handler: `modules/mod.commerce.one-time-payments/src/api-handler.ts`
- DB owner:
  - `mod_commerce_onetime_intents`
  - `mod_commerce_onetime_fulfillments`

`module.json` declares:

- `db.schemaVersion=1`
- `db.migrationsDir="db/migrations"`

## API surface (current)

Base path:

- `/api/modules/mod.commerce.one-time-payments/*`

Routes:

- `GET /health` (public)
- `POST /checkout-sessions` (`auth: 'user'`)
- `GET /intents/:intentId` (`auth: 'user'`)
- `POST /webhooks/stripe` (implemented)
- `POST /webhooks/paypal` (implemented)

## Checkout intent behavior

`POST /checkout-sessions` currently:

- validates input (`productId`, `quantity`, provider, target)
- validates product availability from `mod.commerce.products`:
  - product must exist
  - product kind must be `one_time`
  - product must be published
  - product must have active price
- builds and persists immutable `productSnapshot`
- binds checkout target:
  - `user` target defaults to current user
  - `team` target requires membership validation
- supports idempotent reuse when `idempotencyKey` already exists for same accessible target

Current behavior:

- session creation writes provider identifiers (`sessionId`, `checkoutUrl`, optional `paymentIntentId`) into the intent row.
- intent read includes fulfillment projection to support future polling UIs.

## Fulfillment projection table

`mod_commerce_onetime_fulfillments` is already provisioned for status projection and future webhook reconciliation.

Planned statuses:

- `pending`
- `paid`
- `failed`
- `canceled`
- `refunded`

Stripe webhook behavior implemented:

- verifies Stripe signature
- handles `checkout.session.completed`, `checkout.session.async_payment_failed`, and `checkout.session.expired`
- updates intent/fulfillment state with idempotency by provider event ID
- applies transition guards for out-of-order/non-authoritative events (for example, blocks downgrade from `paid` to `failed`/`canceled`)
- records one-time core payment evidence through `recordCheckoutEvent(...)` with:
  - `orderType='one_time'`
  - `moduleId='mod.commerce.one-time-payments'`
- emits module-level event hook after effective fulfillment updates:
  - `mod.commerce.one-time-payments.fulfillment.updated`

PayPal webhook behavior implemented:

- verifies PayPal signature using webhook verification API
- handles one-time payment event mapping (`PAYMENT.CAPTURE.*` and related terminal events)
- resolves intents by provider order reference and updates fulfillment with idempotency by provider event ID
- applies transition guards for out-of-order/non-authoritative events
- records one-time core payment evidence through `recordCheckoutEvent(...)` with:
  - `orderType='one_time'`
  - `moduleId='mod.commerce.one-time-payments'`
- emits module-level event hook after effective fulfillment updates:
  - `mod.commerce.one-time-payments.fulfillment.updated`

## Tests

Current module tests:

- `tests/modules/mod-commerce-onetime-validation.test.ts`
- `tests/modules/mod-commerce-onetime-api.test.ts`
- `tests/modules/mod-commerce-onetime-stripe-webhook.test.ts`
- `tests/modules/mod-commerce-onetime-paypal-webhook.test.ts`
- `tests/modules/mod-commerce-onetime-fulfillment-state.test.ts`

These cover validator rules, API auth/early-validation behavior, and webhook idempotency/write-through mapping logic.

## Future UI/template readiness

UI is not implemented in this phase, but module is planned to be template-compatible when routes/components are added.

Recommended future component IDs:

- `mod.commerce.one-time-payments.frontend.checkout-summary`
- `mod.commerce.one-time-payments.frontend.checkout-status-card`
- `mod.commerce.one-time-payments.admin.intent-table`
- `mod.commerce.one-time-payments.admin.fulfillment-timeline`

Expected areas for future UI:

- public checkout UX: `area='frontend'`
- admin monitoring/ops: `area='admin'`
- optional account self-service status: `area='dashboard'`

Template policy once UI exists:

- module manifest should expose `templatePack` defaults for module-owned components
- theme overrides should remain enabled by default
- use `lockTemplate` only for safety-critical steps (for example, irreversible payment confirmation dialogs)
