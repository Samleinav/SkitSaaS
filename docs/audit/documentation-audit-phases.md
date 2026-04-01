---
title: Documentation Audit Phases
sidebar_position: 1
description: Process and checklist to keep platform documentation aligned with implementation changes.
---

# Documentation Audit Phases

This document tracks how documentation is audited and normalized for publication in Docusaurus format.

## Phase 1: Structure and Format

- Ensure every page under `docs/` has frontmatter:
  - `title`
  - `sidebar_position` (recommended for stable order)
- Ensure each page has one clear top-level heading and consistent section naming.
- Ensure links are relative and resolvable from the current file.

## Phase 2: Link Integrity

- Validate internal markdown links (`.md`/`.mdx`) resolve to existing files.
- Remove stale references or replace with current pages.
- Ensure index pages only point to maintained docs.

## Phase 3: Content Ownership and Boundaries

- Keep host-level architecture docs in `docs/`.
- Keep module-owned operational detail in:
  - `modules/<moduleId>/README.md`
  - `modules/<moduleId>/docs/*` (optional)
- Keep user-facing guides under `docs/users/` when applicable.
- Recommended module README structure (non-blocking):
  - scope/objective
  - config/env
  - routes/endpoints
  - templates/CTC IDs
  - database/migrations
  - tests/validation
  - troubleshooting

## Phase 4: Release Hygiene

- On each significant feature change, update:
  - impacted docs in `docs/`
  - linked runbooks/checklists
  - related module README/docs when module behavior changed
- Treat broken doc links and stale route/action references as release blockers.
- CI guardrail:
  - `.github/workflows/ci.yml` runs `pnpm docs:check` on push and pull requests.

## Validation Commands

Run these checks locally before merging doc changes:

```bash
pnpm docs:check:frontmatter
pnpm docs:check:links
pnpm docs:check:ownership
pnpm docs:check:module-readmes
pnpm docs:recommend:module-readmes
pnpm docs:check:paths
pnpm docs:check:api
pnpm docs:check:routes
pnpm docs:check:env
pnpm docs:check:db
pnpm docs:check
```

Validation scripts:

- `scripts/docs-validate-frontmatter.mjs`
- `scripts/docs-validate-links.mjs`
- `scripts/docs-validate-ownership.mjs`
- `scripts/docs-validate-module-readmes.mjs`
- `scripts/docs-validate-code-paths.mjs`
- `scripts/docs-validate-api-endpoints.mjs`
- `scripts/docs-validate-page-routes.mjs`
- `scripts/docs-validate-env-keys.mjs`
- `scripts/docs-validate-db-tables.mjs`

Escalation path on failure:

1. Fix docs in the same PR when possible.
2. If blocked by a pending runtime change, add a temporary PR note and track follow-up in a concrete tracked audit note under `docs/audit/`, for example `docs/audit/canary-reports/2026-02-05/notes.md`.
3. Do not merge with unresolved docs check failures.

`docs:check:module-readmes` is advisory and should be treated as quality guidance, not a release blocker.

## Current Audit Artifacts

- [Baseline Snapshots (2026-02-05)](./baseline-snapshots/2026-02-05/README.md)
- [Canary Evidence Notes (2026-02-05)](./canary-reports/2026-02-05/notes.md)
