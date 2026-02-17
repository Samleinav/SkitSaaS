# Plan: Checkout Order-First (Core Subscriptions -> One-Time Module)

Status: Draft
Start date: 2026-02-16
Current phase: Sprint 4 (hardening complete) + Sprint 5 (kickoff in progress)
Last review: 2026-02-16

## Objective
Implement a clean checkout architecture where **core works with checkout orders** (not direct template IDs in URL), starting with subscriptions, and later enabling `mod.commerce.one-time-payments` to consume the same checkout system for one-time payments.

Also evolve checkout to support **extensible payment methods** from core or modules (for example `mod.creditcardpaymentmethodnew`) through SDK contracts and registry-based dispatch.

## Context and problem
Current `/pricing` renders PayPal checkout per plan card, which causes runtime/UI constraints and provider rendering failures in multi-card screens.

Target direction:
- `/pricing` only discovers plans/products.
- Checkout is centralized and order-based.
- Provider UI (PayPal/Stripe) is rendered in a single checkout context.

## Scope
In scope:
- Core refactor for subscription checkout to an order-first model.
- New checkout domain object for pre-payment state.
- Unified checkout page with payment method orchestration.
- Backward-compatible migration from current routes/actions.
- Payment method extensibility layer (SDK + core registry + dispatch).
- Later integration path for one-time module (`/products`, `/cart`, `/order`) using core checkout.

Out of scope (for core-first sprints):
- Full one-time storefront UX implementation in the first core sprints.
- Rebuilding admin product UX now (module-specific admin UX can come later).
- Theme redesign (only baseline/fallback UI required).

## Architecture principles (locked)
- Core checkout works with **orders + immutable snapshot** (amount/currency/target/type).
- Frontend route never depends on raw internal DB IDs in query params.
- Public-facing checkout route uses opaque `checkoutToken`.
- Subscription and one-time share orchestration pattern; lifecycle projection differs by `orderType`.
- Module one-time owns product/cart/order business flows; core owns payment orchestration and settlement records.
- Payment methods are registry-driven; Stripe/PayPal should behave as built-in adapters using the same contract expected from module-provided methods.
- Core owns final checkout-order state transitions and payment evidence persistence, regardless of whether provider logic is core-owned or module-owned.

## Payment method extensibility (new)
Goal:
- Allow modules to register payment methods and capability metadata so checkout can render and execute them without hardcoded provider branching.

SDK/core contract targets:
- Method identity:
- `paymentMethodId` (unique), `ownerType` (`core` | `module`), `moduleId` (nullable for core-owned methods)

- Capabilities:
- `supportsOrderTypes` (`subscription` | `one_time` | both)
- optional constraints by target scope (`user`, `organization`)
- declares support for return/cancel/webhook flows

- Route/URL contract:
- `returnPath` (success/approval callback path)
- `cancelPath` (provider cancel callback path)
- `webhookPath` (provider webhook path, when applicable)
- optional `buildProviderUrls(checkoutContext)` helper for dynamic provider URL composition

- Handlers (per method):
- `startPayment` (creates provider session/subscription/order reference)
- `cancelPayment` (when supported)
- `handleReturn` (success/cancel callback normalization)
- `handleWebhook` (provider webhook normalization)

- Core responsibilities:
- validate method registration and collisions
- dispatch from checkout by `paymentMethodId`
- enforce checkout-order transitions (`ready -> provider_pending -> completed/failed/canceled`)
- persist evidence in `payment_orders`/`payment_transactions` and lifecycle projection rules

- Module responsibilities:
- implement provider-specific logic
- expose routes/callback handlers declared in method contract
- return normalized payloads to core for final state/evidence writes

## Target URL strategy (proposed)
- Discovery:
- `/pricing` (subscriptions)
- Module one-time (later): `/products`, `/products/cart`, `/products/order`

- Checkout entry (server mutation):
- `POST /checkout/subscription/start` (or server action equivalent)

- Checkout render:
- `GET /checkout/[checkoutToken]`

- Payment actions from checkout page:
- `POST /checkout/[checkoutToken]/pay/[paymentMethodId]` (target architecture)
- Compatibility while migrating:
- `POST /checkout/[checkoutToken]/pay/stripe`
- `POST /checkout/[checkoutToken]/pay/paypal`

Notes:
- Input to start endpoint can be `templateSlug` (preferred UX) or `templateId` internally.
- URL should expose only token, never the pricing source identity.

## New core domain model (proposed)
`checkout_orders` (new table, pre-payment lifecycle):
- identity: `id`, `checkoutToken`, `idempotencyKey`
- scope: `orderType` (`subscription` | `one_time`), `targetType`, `targetTeamId`, `targetUserId`
- pricing snapshot: `amount`, `currency`, `planName`, `subscriptionTemplateId` (nullable), `snapshotMetadata`
- provider state: `selectedProvider`, `selectedPaymentMethod`, `providerSessionId`, `providerReferenceId`
- state: `status` (`draft`, `ready`, `provider_pending`, `completed`, `canceled`, `failed`, `expired`)
- control: `expiresAt`, `completedAt`, `canceledAt`, `failedAt`, `createdAt`, `updatedAt`

Important:
- `payment_orders` remains settlement/event evidence.
- `checkout_orders` is orchestration state before and during payment handoff.

## Sprint plan

## Sprint 1 - Core foundation (subscriptions order-first)
Duration target:
- 5 working days

Goal:
- Stop coupling checkout to `/pricing` card-level provider render.
- Create server-side subscription checkout order and tokenized checkout page.

Checklist:
- [x] Define checkout order contract (types + status machine + idempotency rules).
- [x] Add DB migration for `checkout_orders` (indexes + constraints + token uniqueness).
- [x] Add repository/service layer in core checkout domain.
- [x] Add `start subscription checkout` server entry (slug or id input; slug preferred).
- [x] Add `GET /checkout/[checkoutToken]` page that loads order snapshot.
- [x] Update `/pricing` CTA to call start mutation and redirect to token route.
- [x] Remove per-card embedded PayPal button render in `/pricing`.
- [x] Ensure only one provider UI instance is rendered in checkout page context.

Verification checklist:
- [x] Pricing page never mounts provider checkout buttons per plan card.
- [x] Checkout page renders with token and correct snapshot after start mutation.
- [x] Expired/invalid token returns controlled fallback/not-found behavior.

Definition of Done:
- Core subscription checkout can be started and viewed from tokenized route without exposing template IDs in URL.

---

## Sprint 2 - Core payment orchestration (methods + providers)
Duration target:
- 5 working days

Goal:
- Execute payments from `checkout_orders` and map results to existing payment evidence pipeline.

Checklist:
- [x] Implement provider adapters that consume `checkout_orders` snapshot.
- [x] Add checkout payment endpoints/actions by provider (`stripe`, `paypal`).
- [x] Support subscription-specific provider flows (plan create/ensure, session/subscription create).
- [x] Persist provider session/reference metadata in checkout order.
- [x] Finalize checkout order state transitions (`ready -> provider_pending -> completed/failed/canceled`).
- [x] Bridge completion to `recordCheckoutEvent(...)` and existing `payment_orders`/`payment_transactions`.
- [x] Keep subscription lifecycle projection only for `orderType='subscription'`.

Verification checklist:
- [ ] Stripe path works end-to-end via checkout token.
- [ ] PayPal path works end-to-end via checkout token.
- [ ] `payment_orders` evidence remains consistent with current reporting.
- [ ] Subscription lifecycle continues to project correctly after payment completion.

Definition of Done:
- Core subscription checkout is fully provider-driven from order token, with evidence/logging parity.

---

## Sprint 3 - Payment method SPI (SDK + registry + dispatch)
Duration target:
- 5 working days

Goal:
- Make checkout payment methods extensible by module, while keeping core as source of truth for states and evidence.

Checklist:
- [x] Define SDK manifest contract for payment method registration and capabilities.
- [x] Add core payment-method registry loader + validation (id collisions, capability constraints).
- [x] Add checkout dispatch layer by `paymentMethodId` for start/cancel flows.
- [x] Normalize return/webhook contract so core receives provider-agnostic status payloads.
- [x] Refactor core Stripe/PayPal to run through the same registry/dispatch path.
- [x] Add compatibility behavior so existing routes continue working during transition.
- [x] Add tests for method registration conflicts, unsupported order-type usage, and dispatch behavior.

Verification checklist:
- [ ] Stripe and PayPal still work through registry-dispatched handlers.
- [ ] A fake module method can be registered and selected in checkout (without breaking core).
- [ ] Core remains authoritative for state transitions and payment evidence persistence.

Definition of Done:
- Checkout can execute registered payment methods (core or module) through one contract with unified lifecycle control.

---

## Sprint 4 - Core migration, hardening, and docs
Duration target:
- 4 working days

Goal:
- Decommission old direct flows safely and lock operational quality.

Checklist:
- [x] Add compatibility layer for legacy endpoints/actions (`/api/paypal/plan`, old pricing actions) and migrate callers.
- [x] Decide keep/remove window for legacy routes and implement redirects/deprecation logs.
- [x] Add retry/idempotency hardening for duplicate start/payment requests.
- [x] Add observability for checkout-order lifecycle and provider failures.
- [x] Add regression tests for pricing + checkout + callback/webhook paths.
- [ ] Update docs:
- [x] `docs/architecture-routing-actions.md`
- [x] `docs/platform-capabilities.md`
- [x] `docs/features.md` (checkout/subscription behavior)
- [x] Update `AGENTS.md` route notes if new core routes are finalized.

Verification checklist:
- [x] Existing subscription behavior is preserved functionally.
- [x] No remaining frontend dependency on template ID query params.
- [x] New core checkout routes/actions documented and tested.

Definition of Done:
- Core subscriptions run fully on order-first checkout and legacy coupling is removed or intentionally deprecated.

---

## Sprint 5 - One-time module integration on new core checkout
Duration target:
- 5 working days

Goal:
- Keep one-time business UX in module, but delegate payment execution to new core checkout order system.

Checklist:
- [x] Allow `/checkout/[checkoutToken]` page to render `orderType='one_time'` summaries (non-subscription-safe fallback).
- [x] Define integration contract from module to core checkout start:
- [x] module sends target + immutable one-time amount/currency snapshot + metadata.
- [x] core returns `checkoutToken` and canonical checkout URL.
- [x] Extend core start endpoint/service to accept `orderType='one_time'` from authorized module path.
- [x] Add optional module request mode `checkoutMode='core_checkout'` while preserving legacy `provider_session` behavior.
- [ ] In `mod.commerce.one-time-payments`, implement/adjust routes:
- [x] Payment-method dispatcher routes (`/payment-methods/stripe|paypal/{start,cancel}`) and manifest registration.
- [x] `/products`
- [x] `/products/cart`
- [x] `/products/order` (or `/products/order/[orderToken]` per final contract)
- [x] Wire module order/cart confirmation to core checkout token redirect.
- [x] Keep one-time fulfillment logic/module events compatible with final payment events.
- [x] Preserve behavior when module is disabled/uninstalled (core subscriptions unaffected).

Verification checklist:
- [ ] One-time module can create cart/order and pay through core checkout token flow.
- [x] Payment evidence lands in core tables with `orderType='one_time'` + module attribution.
- [x] Module-off scenario does not break core routes.

Definition of Done:
- One-time module uses core order-first checkout for payment while retaining module-owned product/cart/order flows.

## Dependencies
- Decision on slug contract for subscription templates (`slug` field or deterministic alias).
- DB migration window for introducing `checkout_orders`.
- Final decision on legacy route deprecation timeline.
- Provider config consistency in app config (Stripe/PayPal runtime keys).
- SDK manifest/runtime evolution for payment method registration.

## Blockers and open decisions
- [ ] Confirm canonical checkout URL format: `/checkout/[token]` vs `/checkout/order/[token]`.
- [ ] Confirm final naming: `checkout_orders` vs `payment_checkout_orders`.
- [ ] Confirm webhook ownership model for module methods: module endpoint only, core endpoint only, or hybrid dispatch.
- [ ] Confirm ownership boundary for one-time post-payment fulfillment trigger.
- [ ] Confirm where cancel/return URLs are declared: per-method static contract vs dynamic callback resolver.

## Test strategy
Core tests:
- [ ] Unit: checkout order state machine and transition guards.
- [ ] Integration: start checkout from pricing and render token route.
- [ ] Integration: Stripe/PayPal completion path from tokenized checkout.
- [ ] Regression: subscription lifecycle projection unchanged.
- [ ] Regression: legacy route compatibility while deprecation is active.

Module tests (Sprint 5):
- [ ] Contract test: module -> core checkout start payload.
- [ ] Integration: cart/order -> checkout token redirect.
- [ ] Integration: one-time evidence persistence with module attribution.

## Completion criteria (program-level)
- [ ] Subscriptions no longer depend on plan-ID query params for checkout rendering.
- [ ] Core checkout is order-first and provider-agnostic at orchestration layer.
- [ ] Core checkout can execute payment methods registered by core or modules through SDK contract.
- [ ] `/pricing` is simplified to discovery + start checkout.
- [ ] One-time module consumes new core checkout without coupling core to module internals.
- [ ] Docs and AGENTS route/action references are updated with finalized routes.
