---
title: "Module Ops Runbook"
sidebar_position: 0
---

# Module Ops Runbook

Use this page when the task is operational rather than authoring-focused:
enabling a module, syncing runtime state, validating generated artifacts, or
checking whether a module is really available in the current environment.

## Normal Runtime Pipeline

From the project root, the usual pipeline is:

```bash
pnpm modules:build
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate
pnpm modules:sync
```

That order matters because runtime registry, generated metadata, migrations, and
DB-backed module state are separate concerns.

## Targeted Diagnostics

Useful focused commands:

```bash
pnpm modules:build -- --module=mod.<name>
pnpm modules:migrate --module=mod.<name>
pnpm restructure:module-runtime
```

`restructure:module-runtime` is the fastest current health check for registry
vs runtime expectations.

## What `modules:sync` Actually Does

`modules:sync` reconciles registered manifests with `app_modules` runtime rows.

Useful controls:

```bash
MODULES_SYNC_ENABLE_NEW=false pnpm modules:sync
MODULES_SYNC_TIMEOUT_MS=5000 pnpm modules:sync
pnpm modules:sync -- --disable-new
pnpm modules:sync -- --exclude-core
```

Important mental model:

- manifest registration is source truth for "this module exists"
- `app_modules` runtime rows decide install/enable state at runtime

## Admin Runtime Controls

The main operator-facing module control surface is:

- `/admin/app-config/modules`

Use that page when the task is about toggling or reviewing module runtime state
through the host UI rather than scripts.

## Practical Validation Checklist

When a module seems broken, check in this order:

1. did `modules:build` produce the expected output
2. did `modules:prepare` regenerate runtime metadata successfully
3. did module i18n prepare finish cleanly
4. did the module migration run
5. did `modules:sync` create or update the runtime row
6. is the module enabled in admin runtime controls
7. do dispatcher routes load
8. do aliases resolve

## Dispatcher Smoke Targets

Typical smoke surfaces:

- `/admin/modules/<moduleId>`
- `/dashboard/modules/<moduleId>`
- `/modules/<moduleId>`
- any registered alias path for the module
- `/api/modules/<moduleId>/...` for module API slices

Smoke exactly the surfaces the module claims to own in its README.

## Runtime Evidence Mindset

For release work, do not stop at "it builds locally".

Capture evidence that the runtime is healthy:

- module runtime diagnostics
- prepare output
- smoke routes
- canary or evidence packs when the change is production-facing

## Common Mistakes

- treating manifest presence as proof the module is enabled
- changing module code without rerunning prepare/sync
- validating only dispatcher pages while ignoring aliases or module APIs
- forgetting that ops state belongs both in code and in `app_modules`

## Related Docs

- `./testing-and-release.md`
- `../operations/validation-and-canary.md`
- `../modules-and-sdk-boundaries.md`
