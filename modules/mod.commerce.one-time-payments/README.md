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

## UI planning decisions (Sprint 6, 2026-02-17)

- Frontend one-time purchase UI ownership remains in this module.
- Canonical frontend aliases stay:
  - `/products`
  - `/products/cart`
  - `/products/order`
- First UI sprint keeps `frontendRouteAccess='user'` (catalog + cart + order behind authenticated session).
- Core checkout route remains canonical and core-owned (`/checkout/[checkoutToken]`).
- Frontend catalog/cart/order copy now resolves from module i18n keys with safe fallback.

## Frontend IA backlog (implementation-ready)

- `/products` (catalog):
  - list published one-time products with provider + price snapshot
  - handle empty catalog state and unavailable product entries
- `/products/cart`:
  - quantity editor with bounds
  - provider selection constrained by product/provider compatibility rules
  - target type preselection (`team`/`user`) with guardrails
- `/products/order`:
  - order summary + mutable fields (quantity/provider/target)
  - create one-time intent with `checkoutMode='core_checkout'`
  - redirect to `/checkout/[checkoutToken]`
  - map backend error codes to localized user-friendly messages

## Template contract (implemented, theme-first)

Page wrappers:

- `page.frontend.products.catalog`
- `page.frontend.products.cart`
- `page.frontend.products.order`

Granular sections:

- `section.frontend.products.catalog.card`
- `section.frontend.products.cart.summary`
- `section.frontend.products.order.form`

Current payload keys:

- `page.frontend.products.catalog`: `title`, `description`, `total`, `hasProducts`
- `page.frontend.products.cart`: `title`, `description`, `productId`, `quantity`
- `page.frontend.products.order`: `title`, `description`, `provider`, `targetType`
- `section.frontend.products.catalog.card`: `productId`, `productKey`, `name`, `priceLabel`, `provider`
- `section.frontend.products.cart.summary`: `productId`, `quantity`, `unitAmount`, `totalAmount`, `currency`
- `section.frontend.products.order.form`: `productId`, `provider`, `targetType`, `canUseTeamTarget`

Resolution policy:

- Keep default CTC precedence (`theme_area_override` before `module_default`).
- Do not use `module_override`/`lockTemplate` in baseline one-time UX.
- Consider optional `templatePack.defaults` only as fallback for themes without custom templates.

## i18n baseline (implemented)

Current file:

- `modules/mod.commerce.one-time-payments/i18n/global/en.json`

Implemented key namespaces:

- `products.common.*`
- `products.catalog.*`
- `products.cart.*`
- `products.order.*`

## Validation/test backlog

- Existing checkout/domain anchors:
  - `tests/payments/checkout-system-one-time.test.ts`
  - `tests/modules/mod-commerce-onetime-api.test.ts`
  - `tests/modules/mod-commerce-onetime-validation.test.ts`
- Planned UI-focused coverage:
  - route-level render states (`catalog`, `cart`, `order`) with i18n-driven copy
  - error mapping tests from API codes to UI states/messages
  - provider chooser guardrails for unsupported provider/product combinations

## Module-off behavior

- If module is disabled/uninstalled, `/products*` aliases fail closed via module dispatcher fallback.
- Core subscription checkout and core `/checkout/[checkoutToken]` remain operational.
