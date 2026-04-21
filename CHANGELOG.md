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
