# mod.commerce.one-time-payments

One-time payment module scaffold with frontend catalog/order pages and checkout orchestration.

Current scope in this scaffold:

- module registration and runtime wiring
- module-owned DB schema and migrations for one-time intents/fulfillment
- frontend module routes (`/products`, `/products/cart`, `/products/order`)
- API handler with health endpoint
- checkout intent creation endpoint (`POST /checkout-sessions`)
- intent status/read endpoint (`GET /intents/:intentId`) including fulfillment projection
- implemented Stripe webhook endpoint (`POST /webhooks/stripe`)
- implemented PayPal webhook endpoint (`POST /webhooks/paypal`)
- fulfillment transition guard for out-of-order webhook events
- module-level fulfillment update event emission:
  - `mod.commerce.one-time-payments.fulfillment.updated`

Current implementation:

- creates one-time checkout sessions/intents (Stripe + PayPal)
- supports optional checkout creation in core order-first flow:
  - `POST /checkout-sessions` with `checkoutMode: "core_checkout"` returns `intent.checkoutUrl` pointing to `/checkout/[checkoutToken]`
  - default mode remains `provider_session` for backward compatibility
- frontend `/products/order` uses module server action to create one-time intent in `core_checkout` mode and redirects to `/checkout/[checkoutToken]`
- frontend order flow supports both checkout targets:
  - `targetType='team'` when the user has a team and selects team checkout
  - `targetType='user'` for user-scoped checkout (including no-team setups)
- registers module payment methods for core checkout dispatcher:
  - `onetime-stripe` -> `POST /payment-methods/stripe/start`, `POST /payment-methods/stripe/cancel`
  - `onetime-paypal` -> `POST /payment-methods/paypal/start`, `POST /payment-methods/paypal/cancel`
- verifies Stripe/PayPal webhook signatures and reconciles intent/fulfillment records
- records one-time orders through core `recordCheckoutEvent(...)`
- persists module-owned fulfillment state and transition decisions

Module DB ownership:

- `mod_commerce_onetime_intents`
- `mod_commerce_onetime_fulfillments`

Module routes:

- Frontend alias routes:
  - `/products`
  - `/products/cart`
  - `/products/order`
- Health: `/api/modules/mod.commerce.one-time-payments/health`
- Checkout intent create: `/api/modules/mod.commerce.one-time-payments/checkout-sessions`
- Checkout intent read: `/api/modules/mod.commerce.one-time-payments/intents/:intentId`
- Checkout payment-method start/cancel (dispatcher):
  - `/api/modules/mod.commerce.one-time-payments/payment-methods/stripe/start`
  - `/api/modules/mod.commerce.one-time-payments/payment-methods/stripe/cancel`
  - `/api/modules/mod.commerce.one-time-payments/payment-methods/paypal/start`
  - `/api/modules/mod.commerce.one-time-payments/payment-methods/paypal/cancel`
- Stripe webhook endpoint: `/api/modules/mod.commerce.one-time-payments/webhooks/stripe`
- PayPal webhook endpoint: `/api/modules/mod.commerce.one-time-payments/webhooks/paypal`
