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
