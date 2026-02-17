---
title: Commerce One-Time Payments Runbook
---

# Commerce One-Time Payments Runbook

Operational guide for `mod.commerce.one-time-payments` (backend-only phase).

## 1) Required config

Stripe or PayPal can be used for one-time execution.

Accepted config sources (env first, then app config fallback):

- `STRIPE_SECRET_KEY` (or app config namespace `payments.stripe`, key `secret_key`)
- `STRIPE_WEBHOOK_SECRET` (or app config namespace `payments.stripe`, key `webhook_secret`)
- Optional gate: `STRIPE_ENABLED` (or app config key `enabled`)
- `PAYPAL_CLIENT_ID` (or app config namespace `payments.paypal`, key `client_id`)
- `PAYPAL_CLIENT_SECRET` (or app config namespace `payments.paypal`, key `client_secret`)
- `PAYPAL_WEBHOOK_ID` (or app config namespace `payments.paypal`, key `webhook_id`)
- Optional gate: `PAYPAL_ENABLED` (or app config key `enabled`)
- Optional env: `PAYPAL_ENVIRONMENT` (`sandbox|production`)

If secrets are missing:

- `POST /api/modules/mod.commerce.one-time-payments/checkout-sessions` fails with provider not configured
- `POST /api/modules/mod.commerce.one-time-payments/webhooks/stripe` returns `503`
- `POST /api/modules/mod.commerce.one-time-payments/webhooks/paypal` returns `503`

## 2) Health checks

- Module health endpoint:
  - `GET /api/modules/mod.commerce.one-time-payments/health`
- Intent read endpoint:
  - `GET /api/modules/mod.commerce.one-time-payments/intents/:intentId`
  - Requires authenticated user and returns `intent + fulfillment` projection

## 3) Automated local simulation (backend-only, no provider credentials)

Use module tests to validate checkout + webhook orchestration end-to-end with injected provider deps:

```bash
npx tsx --test tests/modules/mod-commerce-onetime-api.test.ts tests/modules/mod-commerce-onetime-validation.test.ts tests/modules/mod-commerce-onetime-stripe-webhook.test.ts tests/modules/mod-commerce-onetime-paypal-webhook.test.ts tests/modules/mod-commerce-onetime-failure-modes.test.ts tests/payments/checkout-system-one-time.test.ts tests/payments/order-subscription-lifecycle.test.ts
```

Expected outcome:

- all tests pass
- checkout session creation paths for Stripe/PayPal return `201`
- webhook pipelines return `handled=true` and preserve idempotency
- no subscription lifecycle projection for `orderType='one_time'`

## 4) Webhook replay procedure (Stripe)

Recommended replay sequence:

1. Locate target Stripe event ID and checkout session ID in Stripe dashboard.
2. Replay webhook to:
   - `/api/modules/mod.commerce.one-time-payments/webhooks/stripe`
3. Inspect API response:
   - `duplicate=true` means same provider event was already processed
   - `handled=true, duplicate=false` means event was accepted
4. Verify intent/fulfillment status via `GET /intents/:intentId`.
5. Verify core order evidence:
   - `payment_orders.order_type = 'one_time'`
   - `payment_orders.module_id = 'mod.commerce.one-time-payments'`
   - corresponding `payment_transactions` sale/reversal row (status-based)

## 5) Webhook replay procedure (PayPal)

Recommended replay sequence:

1. Locate target PayPal event ID and order ID in PayPal dashboard.
2. Replay webhook to:
   - `/api/modules/mod.commerce.one-time-payments/webhooks/paypal`
3. Inspect API response:
   - `duplicate=true` means same provider event was already processed
   - `handled=true, duplicate=false` means event was accepted
4. Verify intent/fulfillment status via `GET /intents/:intentId`.
5. Verify core order evidence:
   - `payment_orders.order_type = 'one_time'`
   - `payment_orders.module_id = 'mod.commerce.one-time-payments'`
   - corresponding `payment_transactions` sale/reversal row (status-based)

## 6) Troubleshooting map

- `provider_webhook_invalid_signature`:
  - Verify Stripe/PayPal webhook secret/id and deployed header forwarding.
- `product_not_published` or `product_missing_active_price` on checkout session create:
  - Validate product publication + active price in `mod.commerce.products`.
- `target_team_forbidden`:
  - Requesting user is not a member of selected team target.
- Webhook handled but no order mutation:
  - Transition guard may have ignored a non-authoritative/out-of-order state change.

## 7) Auditable artifacts

Module tables:

- `mod_commerce_onetime_intents`
- `mod_commerce_onetime_fulfillments`

Core evidence tables:

- `payment_orders`
- `payment_transactions`
- `payment_logs`

Module hook emitted on effective fulfillment updates:

- `mod.commerce.one-time-payments.fulfillment.updated`
