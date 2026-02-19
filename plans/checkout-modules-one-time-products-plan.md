# Plan: Checkout Order-First (Core Subscriptions -> One-Time Module)

Status: In progress
Start date: 2026-02-16
Current phase: Sprint 8 Task 8.2 in progress (multi-item backend contract)
Last review: 2026-02-19

## Sprint 7 progress snapshot (2026-02-18)
- [x] Frontend one-time pages (`/products`, `/products/cart`, `/products/order`) now render with theme wrappers:
  - `page.frontend.products.catalog`
  - `page.frontend.products.cart`
  - `page.frontend.products.order`
  - `section.frontend.products.catalog.card`
  - `section.frontend.products.cart.summary`
  - `section.frontend.products.order.form`
- [x] Admin products pages now render with theme wrappers:
  - `page.admin.products`
  - `page.admin.products.create`
  - `page.admin.products.edit`
  - `section.admin.products.table`
  - `section.admin.products.form`
- [x] Workspace validation green after UI changes: `pnpm check`.
- [x] Module i18n copy migration completed:
  - `modules/mod.commerce.products/i18n/admin/en.json`
  - `modules/mod.commerce.products/i18n/admin/es.json`
  - `modules/mod.commerce.one-time-payments/i18n/global/en.json`
  - `modules/mod.commerce.one-time-payments/i18n/global/es.json`
  - `src/pages.tsx` in both modules now consume `getServerMessages(...).mod[moduleId]` with fallback defaults.
- [x] Core one-time checkout now persists explicit line items (`checkout_order_items`) and `/checkout/[checkoutToken]` renders one-time summary from persisted items with legacy metadata fallback.
- [x] `Buy now` on `/products` now uses direct checkout handoff (`server action -> /checkout/[checkoutToken]`) and keeps error fallback on catalog path (`/products`) without forcing `/products/order`.
- [x] `/products` now resolves `?error=` and renders a visible error alert for failed `buy_now` attempts.
- [x] Admin products create/edit forms now use decimal `priceAmount` + `priceCurrency` select and removed provider/providerPriceId fields from UI (server actions convert to cents and persist provider fields as null).
- [x] Admin products home migrated from manual HTML table to `DataTable` host component:
  - removed legacy GET filters (`kind`, `published`) from page route.
  - moved `kind/publication` filtering into datatable toolbar controls.
- [x] One-time payment-method start routes now apply late provider binding by selected `paymentMethodId` in checkout:
  - Stripe start creates/rebinds Stripe session when intent has PayPal/unbound prior state.
  - PayPal start creates/rebinds PayPal session when intent has Stripe/unbound prior state.
  - intent attach no longer fails on provider mismatch during rebind.
- [x] One-time intent validator now defaults to `checkoutMode='core_checkout'` when request omits `checkoutMode` and `provider`:
  - `provider` is no longer required for baseline intent creation.
  - explicit `provider` and `checkoutMode='provider_session'` payloads are now rejected at API boundary.
- [x] One-time webhook fulfillment persistence now links `orderId` when checkout order is resolvable by provider session:
  - `registerOneTimeIntentFulfillmentFromWebhook` persists `orderId` on insert/update.
  - Stripe/PayPal webhook processors resolve checkout order once and reuse it for fulfillment link + checkout status sync.
- [x] Checkout metadata parser now applies explicit compatibility normalization:
  - infers `schemaVersion` for legacy metadata without version.
  - normalizes/drops invalid `oneTime` envelopes without breaking order reads.

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
- [x] Add optional module request mode `checkoutMode='core_checkout'` (legacy `provider_session` policy later retired in Sprint 8 Task 8.1).
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

---

## Sprint 6 - UI planning package (admin + frontend + templates, no implementation)
Duration target:
- 3 working days

Goal:
- Leave an implementation-ready UI plan for:
- admin product management (`mod.commerce.products`)
- frontend one-time purchase UX (`mod.commerce.one-time-payments`)
- theme/template integration (CTC, theme-first) for future UI build.

Sprint 6 decisions (locked on 2026-02-17):
- Admin product UI ownership stays in `mod.commerce.products` with canonical alias strategy `/admin/products`.
- One-time storefront ownership stays in `mod.commerce.one-time-payments` using `/products`, `/products/cart`, `/products/order`.
- Core checkout remains canonical and core-owned at `/checkout/[checkoutToken]`.
- Frontend access policy for current one-time routes stays `frontendRouteAccess='user'` for first UI sprint.
- CTC naming aligns with existing host conventions (`page.*` for page wrappers, `section.*` for granular slots).
- Theme-first precedence remains default CTC behavior; no `module_override` usage planned for this feature by default.

Current UI planning gaps (must be resolved before coding):
- [x] Confirm UI ownership boundary: admin product CRUD in `mod.commerce.products`, frontend catalog/cart/order in `mod.commerce.one-time-payments`, and core checkout page remains core-owned (`/checkout/[checkoutToken]`).
- [x] Confirm admin route aliases + IA for products (`/admin/products`, `/admin/products/create`, `/admin/products/[productId]/edit`).
- [x] Confirm frontend access policy for `/products`: keep `user` access in first UI sprint.
- [x] Define template ID catalog (admin + frontend) and payload contracts before theme work.
- [x] Define i18n baseline for module UIs (remove hardcoded copy from module pages).

### Task 6.1 (P0) - UX ownership and route matrix lock
Risk:
- Route collisions and mixed responsibilities between modules can cause unstable IA and duplicated logic.

Target files:
- `plans/checkout-modules-one-time-products-plan.md`
- `modules/mod.commerce.products/README.md`
- `modules/mod.commerce.one-time-payments/README.md`
- `AGENTS.md` (only if canonical route lists change)

Checklist:
- [x] Lock canonical route ownership per area (admin/dashboard/frontend/core checkout).
- [x] Lock admin products IA: list, create, edit, publish/unpublish, and provider/type visibility rules.
- [x] Lock frontend products IA: catalog, cart, order confirmation, checkout handoff, return/cancel surfaces.
- [x] Document module-off behavior for UI routes (fail closed/fallback).

Validation checklist:
- [x] Route matrix reviewed against current core routes and module alias rules.
- [x] No collision risk left undocumented.

Commands:
- `pnpm modules:prepare`
- `pnpm exec tsc --noEmit`

### Task 6.2 (P0) - CTC/template contract design (theme-first)
Risk:
- Implementing UI before template contracts creates unstable IDs and theme breakage.

Target files:
- `modules/mod.commerce.products/README.md`
- `modules/mod.commerce.one-time-payments/README.md`
- `plans/core-admin-dashboard-template-coverage-audit-plan.md` (cross-plan alignment)
- `lib/templates/catalog.ts` (reference-only during planning)

Checklist:
- [x] Define admin template IDs (minimum): `page.admin.products`, `page.admin.products.create`, `page.admin.products.edit`, `section.admin.products.table`, `section.admin.products.form`.
- [x] Define frontend template IDs (minimum): `page.frontend.products.catalog`, `page.frontend.products.cart`, `page.frontend.products.order`, `section.frontend.products.catalog.card`, `section.frontend.products.cart.summary`, `section.frontend.products.order.form`.
- [x] Define payload contracts per template ID (data keys and expected shapes).
- [x] Define precedence policy: theme-first defaults, optional module defaults, explicit override-only when needed.
- [x] Decide if module template pack metadata is required for each module in next sprint (optional; evaluate after first UI pass).

Validation checklist:
- [x] IDs are unique and follow existing naming conventions.
- [x] Payload contracts are specific enough to implement tests before UI coding.

Commands:
- `pnpm exec tsc --noEmit`
- `npx tsx --test tests/templates/template-controller.test.ts`
- `npx tsx --test tests/theme/theme-slot-data-contract.test.ts`

### Task 6.3 (P1) - Admin UI implementation backlog definition (`mod.commerce.products`)
Risk:
- Shipping admin pages without action/query boundaries can regress auth and CRUD consistency.

Target files (future implementation scope):
- `modules/mod.commerce.products/src/manifest.ts`
- `modules/mod.commerce.products/src/pages.tsx`
- `modules/mod.commerce.products/src/actions.ts`
- `modules/mod.commerce.products/src/api-handler.ts`
- `modules/mod.commerce.products/i18n/admin/en.json`
- `tests/modules/mod-commerce-products-api.test.ts`

Checklist:
- [x] Define server/page split (`adminPage` router + server actions + API reuse).
- [x] Define table columns and publish state UI states.
- [x] Define create/edit form contract for product types (`subscription` and `one_time`).
- [x] Define permission and audit expectations for admin mutations.
- [x] Define i18n key set for admin UI.

Validation checklist:
- [x] Backlog includes tests for validation errors and publish transitions from UI flow.
- [x] No hardcoded copy policy violation in planned admin pages.

Commands:
- `npx tsx --test tests/modules/mod-commerce-products-api.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint modules/mod.commerce.products/src`

### Task 6.4 (P1) - Frontend UI implementation backlog definition (`mod.commerce.one-time-payments`)
Risk:
- Baseline pages can diverge from checkout contracts and theme/i18n requirements.

Target files (future implementation scope):
- `modules/mod.commerce.one-time-payments/src/pages.tsx`
- `modules/mod.commerce.one-time-payments/src/actions.ts`
- `modules/mod.commerce.one-time-payments/src/manifest.ts`
- `modules/mod.commerce.one-time-payments/i18n/global/en.json`
- `tests/payments/checkout-system-one-time.test.ts`

Checklist:
- [x] Define replacement scope from baseline UI to template-driven + i18n UI.
- [x] Define product card, cart summary, order form, and error/empty/success states.
- [x] Define checkout method selection UX as dynamic at checkout (no provider selector in catalog/cart/order).
- [x] Define checkout handoff copy and return/cancel user messaging.
- [x] Define accessibility and responsive acceptance criteria.

Validation checklist:
- [x] Backlog maps each UI state to an existing API/action response code.
- [x] Planned frontend routes preserve core checkout redirect contract.

Commands:
- `npx tsx --test tests/payments/checkout-system-one-time.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint modules/mod.commerce.one-time-payments/src`

### Task 6.5 (P2) - UI acceptance matrix and rollout plan
Risk:
- Missing rollout criteria can ship partial UI without operational readiness.

Target files:
- `plans/checkout-modules-one-time-products-plan.md`
- `modules/mod.commerce.products/README.md`
- `modules/mod.commerce.one-time-payments/README.md`

Checklist:
- [x] Define acceptance matrix: admin create/edit/publish + frontend catalog/cart/order + checkout completion.
- [x] Define module-enabled vs module-disabled UI behavior checks.
- [x] Define smoke-test order for CI and local verification.
- [x] Define migration note for enabling admin nav/routes when UI lands.

Validation checklist:
- [x] Acceptance matrix covers Stripe + PayPal one-time flows.
- [x] Rollout can be toggled by module enablement without breaking core.
- [x] `pnpm check` passes for full workspace.

Acceptance matrix (Sprint 6 locked):
- Admin products list/create/edit/publish-unpublish covers product types `subscription` and `one_time`.
- Frontend one-time catalog/cart/order covers empty, invalid product, checkout handoff states, and dynamic payment-method selection only inside checkout.
- Checkout completion paths validated for both `onetime-stripe` and `onetime-paypal`.
- Module-on scenario: aliases and module pages resolve normally.
- Module-off scenario: core checkout/subscriptions stay functional and module aliases fail closed (not-found/dispatcher fallback).

Planned rollout order (UI implementation sprint):
1. Implement admin products list + create on `/admin/products` and `/admin/products/create`.
2. Implement admin edit/publish controls on `/admin/products/[productId]/edit`.
3. Refactor frontend `/products`, `/products/cart`, `/products/order` to template + i18n driven render.
4. Add module nav exposure after pages are stable (admin nav item to `/admin/products`).
5. Run full checkout smoke (`stripe` + `paypal`) and module-off verification before release.

Commands:
- `pnpm modules:prepare`
- `pnpm exec tsc --noEmit`
- `pnpm check`

---

## Sprint 8 - One-Time Hardening Backlog (post Sprint 7)
Duration target:
- 5 working days

Goal:
- Close the remaining operational gaps before considering one-time checkout flow fully production-hardened.

### Task 8.1 (P0) - Legacy provider contract cleanup (`provider_session` + provider fields)
Risk:
- Keeping legacy provider coupling in schema/types/metadata can reintroduce pre-checkout provider-locking and confuse future UI/API behavior.

Target files:
- `modules/mod.commerce.one-time-payments/src/types.ts`
- `modules/mod.commerce.one-time-payments/src/validators.ts`
- `modules/mod.commerce.one-time-payments/src/data.ts`
- `modules/mod.commerce.one-time-payments/src/api-handler.ts`
- `modules/mod.commerce.one-time-payments/db/schema.ts`
- `modules/mod.commerce.one-time-payments/db/migrations/*`
- `lib/payments/checkout-orders.ts`
- `tests/modules/mod-commerce-onetime-validation.test.ts`
- `tests/modules/mod-commerce-onetime-api.test.ts`
- `tests/payments/checkout-orders.test.ts`

Checklist:
- [x] Define final compatibility policy for `provider_session` (`remove` vs `feature-flagged fallback`).
- [x] Remove provider requirement from one-time domain types/contracts where not needed.
- [x] Ensure one-time intent creation path remains provider-agnostic by default and explicit in docs/tests.
- [x] Add migration strategy for provider legacy fields (keep/read-only/deprecate/drop) with safe rollout notes.
- [x] Update module README and plan notes to reflect final policy.

Migration policy (locked):
- Keep DB provider fields during hardening window for runtime dispatch/webhook correlation.
- Reject provider preselection at API boundary (`provider`, `provider_session`).
- Persist new intents as provider-unbound; bind provider only at checkout payment-method start.
- Treat existing provider-bound intent rows as backward-readable only; schedule DB field drop after explicit runtime dependency audit.

Validation checklist:
- [x] Creating one-time checkout intent without provider always uses core checkout flow.
- [x] Explicit legacy provider payloads follow the declared compatibility policy (rejected or controlled fallback).
- [x] No checkout method filtering or start-path branching depends on preselected provider.

Commands:
- `npx tsx --test tests/modules/mod-commerce-onetime-validation.test.ts`
- `npx tsx --test tests/modules/mod-commerce-onetime-api.test.ts`
- `npx tsx --test tests/payments/checkout-orders.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint modules/mod.commerce.one-time-payments/src lib/payments/checkout-orders.ts`

### Task 8.2 (P0) - Real multi-item one-time cart/order flow (`1 order -> N products`)
Risk:
- Without a real cart aggregator before checkout creation, one-time line-item support stays partial and user flow remains limited.

Target files:
- `modules/mod.commerce.one-time-payments/src/pages.tsx`
- `modules/mod.commerce.one-time-payments/src/actions.ts`
- `modules/mod.commerce.one-time-payments/src/data.ts`
- `modules/mod.commerce.one-time-payments/src/api-handler.ts`
- `lib/payments/checkout-orders.ts`
- `app/(frontend)/checkout/[checkoutToken]/page.tsx`
- `tests/modules/mod-commerce-onetime-pages.test.ts`
- `tests/modules/mod-commerce-onetime-api.test.ts`
- `tests/payments/checkout-orders.test.ts`

Checklist:
- [x] Define cart aggregate contract (how N products are accumulated before checkout order start).
- [x] Implement one-time checkout order start from multi-item cart payload (`lineItems`) instead of single-product snapshot-only path.
- [x] Enforce one-time order rules for mixed/invalid item payloads.
- [x] Ensure checkout summary renders persisted line items first (legacy fallback only for old orders).
- [x] Add regression coverage for empty cart, mixed invalid payload, and valid N-item checkout creation.

Progress notes (2026-02-19):
- `POST /checkout-sessions` now accepts `lineItems` and keeps backward-compatible `productId`/`quantity` payloads.
- One-time intent creation now resolves N products, enforces same-currency totals, stores `schemaVersion: 2` item snapshots, and creates core checkout line items from snapshot data.
- Frontend cart aggregate contract is now defined and wired:
  - `/products` appends products into `items` query contract (`productId:quantity,...`).
  - `/products/cart` and `/products/order` resolve aggregated items and preserve cart state through route transitions.
  - checkout submit now sends `lineItemsPayload` + `cartItems` to the server action.
- Added regression anchors for contract-level validation:
  - validator/API reject invalid empty `lineItems` payloads before data layer.
  - API accepts valid multi-item `lineItems` payload and keeps core checkout handoff contract.
  - frontend pages/actions cover empty aggregated cart fallback and mixed-currency submit blocking in order flow.
- Remaining gap for Task 8.2 is end-to-end persistence verification (`checkout_order_items`) in DB-backed tests.

Validation checklist:
- [ ] A one-time checkout order can be created from N products and persists `checkout_order_items` consistently.
- [ ] Checkout page renders totals from persisted line items for new orders.
- [ ] Legacy single-item metadata orders remain readable/payable during migration window.

Commands:
- `npx tsx --test tests/modules/mod-commerce-onetime-pages.test.ts`
- `npx tsx --test tests/modules/mod-commerce-onetime-api.test.ts`
- `npx tsx --test tests/payments/checkout-orders.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint modules/mod.commerce.one-time-payments/src app/(frontend)/checkout/[checkoutToken]/page.tsx lib/payments/checkout-orders.ts`

### Task 8.3 (P1) - Enforce strict subscription invariant (`1 subscription order = 1 active checkout order`)
Risk:
- Relying only on service-layer reuse logic (without stronger invariant controls) can allow race duplicates under concurrency.

Target files:
- `lib/payments/checkout-orders.ts`
- `lib/db/schema.ts`
- `lib/db/migrations/*`
- `tests/payments/checkout-orders.test.ts`
- `tests/payments/order-subscription-lifecycle.test.ts`

Checklist:
- [x] Define invariant scope precisely (target, template, status window, retry/idempotency behavior).
- [x] Add DB-level guard strategy (partial unique index and/or equivalent constraint) aligned with lifecycle statuses.
- [x] Align create/reuse services to deterministic behavior under concurrent requests.
- [x] Add migration/backfill notes for existing duplicated historical records.
- [ ] Add regression tests for duplicate-start attempts and idempotent reuse.

Progress notes (2026-02-19):
- Added DB-level partial unique indexes for active subscription checkout scope:
  - `checkout_orders_active_subscription_team_scope_idx`
  - `checkout_orders_active_subscription_user_scope_idx`
- Added migration backfill that expires duplicate active rows per scope before enforcing indexes.
- `createSubscriptionCheckoutOrder` and `createUserSubscriptionCheckoutOrder` now resolve unique-violation races by returning the existing active scoped order.
- Added regression guard test in `tests/payments/checkout-orders.test.ts` to assert migration invariant SQL contract.
- Remaining gap: add a true concurrent duplicate-start runtime test (DB-backed integration) to close the final checklist item.

Validation checklist:
- [x] Concurrent subscription checkout start attempts cannot create duplicate active checkout orders for same scope.
- [x] Existing subscription lifecycle projections continue unchanged.
- [x] One-time order behavior is unaffected by subscription invariant hardening.

Commands:
- `npx tsx --test tests/payments/checkout-orders.test.ts`
- `npx tsx --test tests/payments/order-subscription-lifecycle.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint lib/payments/checkout-orders.ts lib/db/schema.ts`

## Dependencies
- Decision on slug contract for subscription templates (`slug` field or deterministic alias).
- DB migration window for introducing `checkout_orders`.
- Final decision on legacy route deprecation timeline.
- Provider config consistency in app config (Stripe/PayPal runtime keys).
- SDK manifest/runtime evolution for payment method registration.
- UI ownership and CTC template contract lock (Sprint 6 P0).

## Blockers and open decisions
- [ ] Confirm canonical checkout URL format: `/checkout/[token]` vs `/checkout/order/[token]`.
- [ ] Confirm final naming: `checkout_orders` vs `payment_checkout_orders`.
- [ ] Confirm webhook ownership model for module methods: module endpoint only, core endpoint only, or hybrid dispatch.
- [ ] Confirm ownership boundary for one-time post-payment fulfillment trigger.
- [ ] Confirm where cancel/return URLs are declared: per-method static contract vs dynamic callback resolver.
- [x] Confirm admin product UI route alias strategy: use `/admin/products` canonical alias.
- [x] Confirm frontend `/products` access policy: keep `user` in first UI implementation sprint.
- [x] Confirm template ID catalog and payload contracts for admin/frontend one-time flows.

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
- [x] Legacy one-time provider contract (`provider_session`/provider preselection) is retired or explicitly gated by policy.
- [ ] One-time checkout supports N-item cart/order creation path before `/checkout/[checkoutToken]`.
- [ ] Subscription checkout enforces strict single-active-order invariant for the same target/template scope.
- [ ] Docs and AGENTS route/action references are updated with finalized routes.
