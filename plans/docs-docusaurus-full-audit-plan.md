# Plan: Full Documentation Audit and Verification (Docusaurus-Ready)

Status: Completed  
Start date: 2026-02-21  
Current phase: Completed; automated checks and ownership guardrails in place  
Last review: 2026-02-21

## Objective

Review the full project documentation end-to-end and verify it is technically correct, ownership-aligned, and publishable in Docusaurus without broken navigation or stale contracts.

Primary goals:

1. Enforce a clear boundary between core docs and module-owned docs.
2. Verify every doc is structurally valid for Docusaurus (frontmatter, category placement, navigation consistency).
3. Verify technical correctness against current code/contracts (routes, APIs, env vars, runtime behavior).
4. Add repeatable validation checks so documentation quality does not regress.

## Scope

- Core docs under `docs/`.
- Host extension references in:
  - `docs/modules/*`
  - `docs/sdk/*`
- Module documentation ownership checks in:
  - `modules/*/README.md`
  - `modules/*/docs/*` (if present)
- Agent guidance that references documentation paths:
  - `AGENTS.md`
- Planning and verification artifacts in:
  - `plans/*`

## Out of Scope

- Product copywriting rewrite for marketing tone.
- Translation/localization of docs content.
- Re-architecture of runtime features purely to match docs.
- Major visual Docusaurus theming customization.

## Baseline Findings (2026-02-21)

- Folder structure is now improved (`core`, `subscriptions`, `operations`, `extensions`, `audit`), but full correctness review is pending.
- Documentation ownership drift happened before (module-specific internals leaked into core docs).
- Missing module README files detected for example modules:
  - `modules/mod.example.admin`
  - `modules/mod.example.api`
  - `modules/mod.example.dashboard`
- Need systematic validation beyond manual checks:
  - link integrity
  - frontmatter completeness
  - route/api/env reference accuracy
  - ownership boundary compliance

## Definition of Correct Documentation

A documentation page is considered correct only if all are true:

1. Structure:
   - valid frontmatter (`title`, recommended `sidebar_position`, optional `description`)
   - placed in the correct folder/category
2. Navigation:
   - reachable from index/category and not orphaned unintentionally
   - no broken relative links
3. Technical accuracy:
   - routes match `app/*`
   - API paths match `app/api/*`
   - env keys match active runtime/config expectations
   - table/model names match current schema and queries
4. Ownership:
   - core docs do not duplicate module internals
   - module-specific implementation/ops details live in `modules/<moduleId>/README.md` (or module docs)
5. Testability:
   - validations can be re-run by command (not one-time manual review)

## Priority Order

1. P0 - Audit framework + hard validations (structure/links/ownership/routing correctness).
2. P1 - Content correction sweep across all docs and module README parity.
3. P2 - Continuous enforcement in CI and contribution workflow.

---

## Task 1 (P0): Freeze Documentation Taxonomy and Ownership Rules

### Risk

Without a locked taxonomy, new docs will continue to be added in inconsistent locations and ownership boundaries will regress.

### Target files

- `docs/00-documentation-index.md`
- `docs/core/*`
- `docs/subscriptions/*`
- `docs/operations/*`
- `docs/extensions/*`
- `docs/audit/*`
- `docs/modules/_category_.json`
- `docs/sdk/_category_.json`
- `AGENTS.md`

### Checklist

- [x] Confirm final folder taxonomy and intended purpose of each folder.
- [x] Add explicit ownership note to `docs/00-documentation-index.md` (core vs module docs).
- [x] Ensure no module-specific runbook/config matrix remains duplicated under core docs.
- [x] Confirm `AGENTS.md` points to new canonical doc paths.
- [x] Document exceptions policy (what is allowed in core docs about modules).

### Validation checklist

- [x] Every top-level docs section has category metadata (`_category_.json`) where needed.
- [x] No stale references to pre-reorg file paths.
- [x] Ownership rule appears in both docs index and `AGENTS.md`.

### Commands

- `rg -n "docs/features\\.md|docs/platform-capabilities\\.md|docs/payment-events\\.md|docs/module-development\\.md" docs AGENTS.md`
- `rg --files docs`

---

## Task 2 (P0): Automate Structural and Link Validation

### Risk

Manual checking is error-prone and does not scale; broken links/frontmatter drift will reappear quickly.

### Target files

- `scripts/docs-validate-frontmatter.mjs` (new)
- `scripts/docs-validate-links.mjs` (new)
- `scripts/docs-validate-ownership.mjs` (new)
- `package.json` (new scripts)
- `docs/audit/documentation-audit-phases.md`

### Checklist

- [x] Create frontmatter validator for all `docs/**/*.md(x)`.
- [x] Create relative markdown link validator.
- [x] Create ownership-boundary linter:
  - detect module internals duplicated in core docs (`docs/core`, `docs/subscriptions`, `docs/operations`)
  - allow references to `modules/<moduleId>/README.md` as pointers
- [x] Expose scripts in `package.json`:
  - `docs:check:frontmatter`
  - `docs:check:links`
  - `docs:check:ownership`
  - `docs:check` (aggregated)
- [x] Document how to run these checks in `docs/audit/documentation-audit-phases.md`.

### Validation checklist

- [x] Validators fail on intentionally broken sample input.
- [x] Validators pass on current clean docs state.
- [x] `docs:check` can run locally in one command.

### Commands

- `node scripts/docs-validate-frontmatter.mjs`
- `node scripts/docs-validate-links.mjs`
- `node scripts/docs-validate-ownership.mjs`
- `pnpm run docs:check`

---

## Task 3 (P0): Full Technical Accuracy Audit by Domain

### Risk

Docs may be structurally valid but still technically wrong (routes/endpoints/env/contract drift).

### Target files

- `docs/core/platform-capabilities.md`
- `docs/core/architecture-routing-actions.md`
- `docs/core/database-model.md`
- `docs/core/env-variables.md`
- `docs/core/theme-build-time-only-adr.md`
- `docs/subscriptions/features-and-quotas.md`
- `docs/subscriptions/payment-events-lifecycle.md`
- `docs/subscriptions/dashboard-subscription-management.md`
- `docs/subscriptions/checkout-subscription-change-checklist.md`
- `docs/operations/admin-dashboard.md`
- `docs/operations/system-activity-logs.md`
- `docs/operations/email-system.md`
- `docs/operations/events-hooks.md`
- `docs/operations/events-hooks-emitters.md`
- `docs/operations/ops-validation-pack.md`
- `docs/operations/ops-canary-pack.md`
- `docs/operations/ops-commerce-onetime-runbook.md`
- `docs/extensions/module-development-index.md`
- `docs/modules/*`
- `docs/sdk/*`

### Checklist

- [x] Verify all route references against current `app/*`.
- [x] Verify all API references against current `app/api/*`.
- [x] Verify env variable names/default semantics against runtime config code.
- [x] Verify DB table names and lifecycle terms against schema and query layers.
- [x] Verify template/CTC references against current runtime implementation.
- [x] Verify module runtime docs reflect current manifest/sdk contracts.
- [x] Verify examples still compile conceptually (no obsolete APIs in snippets).

### Validation checklist

- [x] All doc-referenced routes exist.
- [x] All doc-referenced APIs exist.
- [x] All doc-referenced env keys exist or are clearly marked legacy/deprecated.
- [x] All doc-referenced table names exist or are clearly marked legacy.

### Commands

- `rg -n "app/\\(|/api/|ENV|THEME_|AUTH_|PAYPAL_|STRIPE_" docs`
- `pnpm exec tsc --noEmit`

---

## Task 4 (P1): Module Documentation Ownership and README Parity

### Risk

If module READMEs are incomplete or missing, core docs become overloaded again.

### Target files

- `modules/mod.auth.enterprise-sso/README.md`
- `modules/mod.auth.passkey/README.md`
- `modules/mod.auth.social-logins/README.md`
- `modules/mod.commerce.one-time-payments/README.md`
- `modules/mod.commerce.products/README.md`
- `modules/mod.example.admin/README.md` (new)
- `modules/mod.example.api/README.md` (new)
- `modules/mod.example.dashboard/README.md` (new)
- `modules/mod.example.package/README.md`
- `modules/mod.example.suite/README.md`
- `docs/modules/*` (host-side contract pages only)

### Checklist

- [x] Ensure each module has mandatory `README.md`.
- [x] Recommend common README sections (advisory, non-blocking):
  - objective/scope
  - module config/env keys
  - routes/endpoints
  - templates/CTC ids (if any)
  - DB/migrations (if any)
  - tests and troubleshooting
- [x] Move module-only operational details out of core docs into module READMEs.
- [x] Keep `docs/modules/*` focused on host runtime contracts, not per-module internals.

### Validation checklist

- [x] `modules/*/README.md` exists for every module.
- [x] Core docs only link to module README for module internals.
- [x] No duplicated per-module config matrix in core docs.

### Commands

- `Get-ChildItem modules -Directory | ForEach-Object { Test-Path (Join-Path $_.FullName 'README.md') }`
- `rg -n "mod\\.[a-z0-9.-]+" docs/core docs/subscriptions docs/operations`

---

## Task 5 (P1): Docusaurus Navigation and Discoverability Pass

### Risk

Docs can be accurate but still hard to navigate, causing misuse and duplicate pages.

### Target files

- `docs/00-documentation-index.md`
- `docs/**/_category_.json`
- `docs/modules/_category_.json`
- `docs/sdk/_category_.json`
- `docs/audit/_category_.json`
- `docs/audit/baseline-snapshots/_category_.json`
- `docs/audit/canary-reports/_category_.json`

### Checklist

- [x] Ensure each folder has intentional order and labels.
- [x] Remove duplicate or ambiguous page titles.
- [x] Add/normalize `description` where missing in key entry pages.
- [x] Ensure index and categories tell the same information architecture.
- [x] Keep sidebar positions stable and sequential within each section.

### Validation checklist

- [x] No orphan primary pages (all discoverable from index/category).
- [x] Sidebar/category order matches intended reading flow.
- [x] No conflicting duplicate labels causing confusion.

### Commands

- `rg --files docs | sort`
- `pnpm run docs:check`

---

## Task 6 (P2): CI and PR Guardrails for Documentation

### Risk

Without CI guardrails, the same drift returns after a few feature branches.

### Target files

- `package.json`
- `.github/workflows/*` (if docs checks are wired in CI)
- `AGENTS.md`
- `docs/audit/documentation-audit-phases.md`

### Checklist

- [x] Add docs validation command to CI pipeline (non-optional).
- [x] Add PR checklist item requiring docs ownership check.
- [x] Require docs update when contracts/routes/env/API change.
- [x] Document escalation path when docs checks fail.

### Validation checklist

- [x] CI fails on broken docs links/frontmatter/ownership violations.
- [x] Contributors can run same checks locally before push.

### Commands

- `pnpm run docs:check`
- `pnpm check`

---

## Testing Strategy for This Plan

1. Fast checks first:
   - structure + links + ownership scripts
2. Contract correctness:
   - targeted route/api/env/schema spot checks
3. Regression checks:
   - run `pnpm exec tsc --noEmit` after doc/code reference updates
4. Optional full check:
   - `pnpm check` when branch is stable

If external unrelated failures appear, record:

- failing command
- why unrelated to docs scope
- what validations still passed

## Open Questions

- [x] Should example modules (`mod.example.*`) be treated as strict production-quality docs or minimal templates?
  Decision (2026-02-21): treat as minimal templates with clear ownership/scope docs; do not require production-depth runbooks.
- [x] Do we want to enforce `description` in frontmatter for all docs (not only key pages)?
  Decision (2026-02-21): keep `description` recommended for entry pages and key indexes; not mandatory for every page.
- [x] Should `docs:check` run in `prebuild` or only in CI + manual local workflow?
  Decision (2026-02-21): keep `docs:check` as CI hard gate and manual local command; do not add to `prebuild`.

## Dependencies / Blockers

- Resolved (2026-02-21): module-specific operational docs live in module README/docs; core docs only link/pointer where needed.
- Resolved (2026-02-21): `docs:check` remains hard-fail for structural/accuracy checks; README section standardization remains advisory.

## Completion Criteria

- All docs pass automated validation (`frontmatter`, `links`, `ownership`).
- No core doc contains module-only internals that belong in module README/docs.
- Every module has a `README.md`; section structure guidance is documented as recommendation.
- Documentation navigation is coherent in Docusaurus categories and index.
- CI guardrails are enabled to prevent regression.
