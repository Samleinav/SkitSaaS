---
name: mod-testing-release
description: Test and release a source-package module. Use this skill when writing module contract tests, running the module validation suite, or preparing a module for release.
---

# mod-testing-release

## Scope

Module contract tests, API handler tests, `runSourcePackageContractChecks`, ops runbook, and the full release validation pipeline.

## Required References

- `docs/modules/09-testing.md` — runtime tests, API handler tests, theme runtime tests
- `docs/modules/10-ops-runbook.md` — release checklist, module ops procedures
- `docs/reference/05-sdk-changelog.md` — SDK gaps logged before release

## Contract Test (Required for source-package)

Every `source-package` module must have a contract test:

```ts
// modules/mod.<id>/tests/module-contract.test.mjs
import { runSourcePackageContractChecks } from '@skitsaas/sdk/testing';

await runSourcePackageContractChecks({
  moduleId: 'mod.<id>',
  manifestPath: new URL('../dist/manifest.js', import.meta.url)
});
```

Declare in `module.json`:

```json
{
  "testCommand": "pnpm test:module"
}
```

`pnpm modules:build` runs `testCommand` after a successful build.

## API Handler Test

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

test('health endpoint returns 200', async () => {
  const { apiHandler } = await import('../dist/manifest.js');
  const res = await apiHandler(new Request('http://test/health'));
  assert.equal(res.status, 200);
});
```

## Module Checklist (Pre-Release)

```bash
# 1. Build and test
pnpm modules:build --module=mod.<id>     # includes testCommand

# 2. Validate pipeline
pnpm modules:prepare                      # sdkRange compat check
pnpm modules:i18n && pnpm i18n:prepare    # no key conflicts

# 3. Migrations
pnpm modules:migrate --dry-run --module=mod.<id>
pnpm modules:migrate --module=mod.<id>

# 4. Sync DB state
pnpm modules:sync

# 5. Boundary check
rg -n "from '@/|from \"@/" modules/mod.<id>/src
# must return 0 matches

# 6. Type check
pnpm exec tsc --noEmit
```

## SDK Gap Audit (Mandatory Before Release)

Review `docs/reference/05-sdk-changelog.md`:
- All gaps discovered during this module's sprint must be logged.
- `type: gap` entries must have a workaround or escalation path documented.
- No module ships using forbidden host imports as a shortcut.

## Release Marker

Update `modules/<moduleId>/README.md` with:
- Version shipped
- DB schema version
- SDK range used
- Any known SDK gaps with workaround status
