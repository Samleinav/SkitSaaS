---
title: "Validation And Canary"
sidebar_position: 0
---

# Validation And Canary

Use this page when the task is about deployment hygiene, smoke checks, canary
evidence, or runtime validation packs.

## Main Goal

Before treating a release as healthy, verify:

- module runtime compatibility
- theme compatibility
- i18n integrity
- type safety
- route health on important admin/runtime surfaces

## Core Validation Commands

Normal validation path:

```bash
pnpm modules:prepare
pnpm themes:prepare
pnpm i18n:prepare
pnpm exec tsc --noEmit
```

These commands catch a large share of runtime drift before a full deploy review.

## Smoke And Canary Helpers

Current helper scripts use env-driven inputs for:

- smoke base URL
- auth cookie
- canary label and output
- evidence output folder

Useful env families:

- `SMOKE_*`
- `CANARY_*`
- `EVIDENCE_*`

Related scripts:

- `scripts/restructure-admin-smoke.ts`
- `scripts/restructure-canary-report.ts`
- `scripts/restructure-evidence-pack.ts`

## What A Good Validation Pass Verifies

At minimum, verify:

1. dispatcher and core routes respond as expected
2. enabled modules match intended runtime state
3. theme prepare output is healthy
4. i18n prepare has no collisions
5. important admin/runtime pages still load

## Module And Theme Angle

Operational validation is not just a core-app concern.

It should also check:

- module registry parity
- module migration state
- theme pack compatibility
- generated artifacts that runtime depends on

## Evidence Mindset

For higher-confidence release work, produce evidence that can be reviewed later:

- canary output
- smoke results
- module/runtime checks

This is especially useful when a deployment changes routing, themes, modules,
or subscription/payment behavior.

## Common Mistakes

- treating `tsc` success as enough validation
- forgetting prepare pipelines before smoke checks
- validating feature code but not generated artifacts

## Related Docs

- `./system-activity-and-audit-logs.md`
- `../reference/env-and-runtime-config.md`
- `../modules-development/testing-and-release.md`
- `../theme-development/getting-started.md`
