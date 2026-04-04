---
title: "Module Testing And Release"
sidebar_position: 0
---

# Module Testing And Release

This page is the operational pass for module work after the feature itself is
implemented.

## Normal Pipeline

From the project root:

```bash
pnpm modules:build
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate
pnpm modules:sync
```

For targeted diagnostics:

```bash
pnpm modules:build -- --module=mod.<name>
pnpm modules:migrate --module=mod.<name>
```

## What To Verify

Before treating a module as ready, verify:

- `module.json` is correct
- manifest matches the intended runtime contract
- routes and aliases are documented
- API contract is documented
- i18n files are in the correct shape
- migrations are owned by the module
- README reflects the real runtime

## Canonical README Expectations

At minimum, the README should explain:

- module mode
- route surfaces and aliases
- API base
- build and test commands
- config/env keys
- operational notes

## Release Mindset

For `source-package` modules in particular:

- keep the SDK boundary clean
- ensure compiled output exists where `module.json` says it does
- treat compatibility drift as a release blocker, not as a cosmetic issue

## Common Mistakes

- validating the code but forgetting the README and runtime metadata
- shipping a `source-package` module that still depends on host-only imports
- treating example modules as proof of correctness without checking current pipeline outputs
