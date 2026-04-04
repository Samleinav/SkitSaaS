---
title: "Build-Time Selection And ADR"
sidebar_position: 0
---

# Build-Time Selection And ADR

Use this page when the task is about theme selection policy, generated theme
artifacts, or the operational rule for switching themes across environments.

## Current Model

SkitSaaS treats theme selection as a build-time concern.

Normal rendering does not depend on users toggling themes dynamically at
runtime. Instead, the selected themes are prepared into generated artifacts
before `dev` or `build`.

## Canonical Environment Selectors

The important env keys are:

- `THEME_ADMIN`
- `THEME_DASHBOARD`
- `THEME_FRONTEND`
- `THEME_TEMPLATE_PRIORITY`

Legacy aliases still exist for migration compatibility:

- `THEME_ADMIN_DEFAULT`
- `THEME_DASHBOARD_DEFAULT`

## Preparation Step

Theme preparation is the contract-enforcing step:

```bash
pnpm themes:prepare
```

That script validates theme selection and writes generated artifacts consumed by
the runtime.

## Generated Outputs

The current generated layer includes:

- `lib/themes/external.generated.ts`
- `lib/themes/selection.generated.ts`
- `lib/themes/code-registry.generated.ts`
- `lib/themes/frontend-routes.generated.ts`
- `lib/themes/assets.generated.ts`

If those are stale, theme behavior can look "mysteriously wrong" even when the
theme source files are correct.

## What `themes:prepare` Enforces

The build step should fail when:

1. the selected theme ID does not exist
2. the selected theme does not support the target area
3. required backoffice templates are missing after precedence is applied
4. template priority settings produce an invalid result

This is intentional. Missing required theme pieces are build problems, not
runtime surprises to accept silently.

## Frontend Vs Backoffice

Theme selection affects areas differently:

- `frontend` is route-driven
- `admin` and `dashboard` are CTC/template-driven

That means the same theme task can involve two different contracts:

- `routes.ts` for public pages
- template IDs and CTC precedence for backoffice pages

## Operational Rule

Changing the active theme means:

1. update the env selection
2. run `pnpm themes:prepare`
3. rebuild or redeploy

Do not document theme switching like a normal DB-backed runtime toggle unless
the task is explicitly about legacy migration behavior.

## Auth Route Nuance

Remember the area split for auth surfaces:

- `/admin/login` resolves from admin theme selection
- `/login` and `/sign-up` resolve from dashboard theme selection

## Practical Rule

If a theme change is not visible:

1. confirm the env value
2. rerun `pnpm themes:prepare`
3. confirm the generated files changed as expected
4. confirm whether the target surface is route-driven or template-driven

## Common Mistakes

- treating theme selection like a live DB preference when the current model is
  build-time oriented
- debugging `components/ui/*` while the real problem is stale generated theme
  output
- changing a backoffice template and forgetting that theme priority can alter
  the winner

## Related Docs

- `./getting-started.md`
- `./template-precedence-and-locking.md`
- `../reference/env-and-runtime-config.md`
