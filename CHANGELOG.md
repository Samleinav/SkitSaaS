# Changelog

Repo-level change log for non-SDK implementation batches.

SDK contract changes should continue to be recorded in
`docs/reference/05-sdk-changelog.md`.

## 2026-04-20 - audit-hardening-batch-1

- Added a tracked implementation plan for the SaaS audit hardening work in
  `plans/saas-audit-bugs-performance-hardening.md`.
- Fixed `/admin` home summary so open subscription metrics aggregate current
  assignments across both organization and user scopes.
- Reduced `/admin` recent activity overfetch so the home widget only requests
  the visible slice it renders.
- Made account update, password update, and account deletion flows transactional
  in both dashboard actions and legacy auth actions.
- Introduced a shared soft-delete email helper that preserves uniqueness while
  respecting the `users.email` length limit.
- Synced admin dashboard operations docs to reflect the updated summary and
  recent-activity behavior.

## 2026-04-20 - subscription-feature-display-order

- Added `display_order` to `subscription_template_features`, including a data
  migration that backfills existing rows in stable `10`-step increments per
  template.
- Added normalization helpers so admin form input accepts explicit order values
  and safely derives defaults from submitted row order when blank.
- Updated admin subscription template editing to expose feature order controls
  while keeping managed feature constraints intact.
- Updated pricing and template queries to return features ordered by
  `display_order`, then stable creation/id fallback.
- Synced docs and tests for the new subscription feature presentation ordering
  behavior.

## 2026-04-20 - team-membership-hardening

- Added deterministic "current team" resolution helpers so auth, pricing,
  checkout, and dashboard fallbacks stop depending on unordered
  `team_members.findFirst()` behavior.
- Added a migration that removes duplicate `team_members` rows before creating
  a real unique index on (`user_id`, `team_id`), plus a supporting `team_id`
  lookup index.
- Aligned admin user deletion with the shared soft-delete email helper and moved
  user subscription cancellation into the transactional delete flow.
- Added focused tests and synced human/agent reference docs for the new team
  membership guarantees.

## 2026-04-21 - checkout-route-guest-hardening

- Fixed the canonical checkout route metadata so guest paid-signup flows are no
  longer blocked by blanket API session auth before `signup_intent` access
  checks run.
- Added explicit rate limits for guest-capable checkout method discovery and
  the legacy PayPal return compatibility route.
- Updated `withApiRouteEntries()` so CORS headers and `OPTIONS` preflight
  handling still work when `preDispatch` short-circuits a request before the
  typed dispatcher runs.
- Synced routing/security docs with the token-aware guest checkout model.

## 2026-04-22 - login-route-canonicalization

- Switched dashboard unauthenticated redirects in `proxy.ts`, page proxies, and
  `requireCurrentUser()` to use `/login` as the canonical destination.
- Kept `/sign-in` available as a public legacy alias for compatibility and
  dashboard-theme resolution, instead of using it as the primary redirect
  target.
- Updated tests and SDK docs to reflect `/login` as the main dashboard auth
  route.

## 2026-04-22 - module-checkout-callback-fallback

- Kept normalized internal `POST` dispatch for module-owned checkout actions,
  but added a compatibility fallback for `GET` return/cancel callbacks when a
  module only exposes a typed route instead of the normalized POST handler.
- Added a focused regression test covering module payment-method return
  fallback dispatch.
- Documented the normalized-vs-raw callback bridge behavior in the platform and
  module runtime docs.

## 2026-04-22 - legacy-paypal-cancel-alignment

- Extracted a shared core checkout-cancel access helper so canonical and legacy
  PayPal cancel routes use the same authorization rules.
- Updated `POST /api/paypal/checkout/cancel` to support the canonical access
  model for team owner checkout, user-scope checkout, and guest
  `signup_intent` cancel flows instead of the old team-owner-only behavior.
- Added focused coverage for the shared cancel-access decision matrix and
  documented the compatibility-route alignment.
