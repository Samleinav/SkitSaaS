---
title: "Documentation And Evidence"
sidebar_position: 0
---

# Documentation And Evidence

Use this page when the task depends on documentation hygiene, ownership, or
repeatable evidence for review and release work.

## Documentation Hygiene Model

The practical model for this repo is:

- shared host/runtime behavior belongs in shared docs
- module-specific operational detail belongs with the module
- broken doc links and stale contract references should be treated seriously

Current split:

- `docs/`
  broad human/web documentation
- `.agents/docs/skitsaas/`
  agent-oriented active reference and playbooks
- `modules/<moduleId>/README.md`
  module-owned source of truth for module-specific behavior

## Ownership Rules

Use these rules before writing docs:

- host-level architecture belongs in shared docs
- module env keys, route matrices, and runbooks should stay with the module
- agent docs should summarize and guide; they should not silently diverge from
  the deeper human docs

## Audit Phases

When normalizing or reviewing docs, check at least these phases:

1. structure and format
2. link integrity
3. content ownership and boundaries
4. release hygiene

That keeps documentation review operational instead of purely cosmetic.

## Validation Commands

Historical validation flow in this repo included checks such as:

```bash
pnpm docs:check:frontmatter
pnpm docs:check:links
pnpm docs:check:ownership
pnpm docs:check:module-readmes
pnpm docs:check:paths
pnpm docs:check:api
pnpm docs:check:routes
pnpm docs:check:env
pnpm docs:check:db
pnpm docs:check
```

Practical rule:

- if those checks exist in the current workflow, docs issues should be fixed in
  the same task instead of deferred casually

## Evidence Mindset

For release or canary work, evidence should be:

- repeatable
- clearly dated or labeled
- tied to the runtime slice that changed

High-value evidence often includes:

- canary output
- smoke results
- admin log evidence
- module/runtime parity checks

## Evidence Scripts

Relevant scripts in this repo include:

- `scripts/restructure-canary-report.ts`
- `scripts/restructure-evidence-pack.ts`
- `scripts/restructure-admin-smoke.ts`

These scripts are part of the operational evidence path, not just ad-hoc local
helpers.

## Escalation Rule

When docs and code disagree:

1. call out the conflict explicitly
2. verify intended runtime behavior
3. update docs in the same task when possible

Do not leave the disagreement implicit for later readers.

## Common Mistakes

- updating runtime behavior without updating shared docs
- putting module-owned operational detail in shared docs
- treating broken links or stale route references as non-issues
- collecting evidence without a stable naming/date convention

## Related Docs

- `../operations/validation-and-canary.md`
- `../operations/system-activity-and-audit-logs.md`
- `../reference/env-and-runtime-config.md`
