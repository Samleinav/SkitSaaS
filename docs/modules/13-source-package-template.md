---
title: Source-Package Template
sidebar_position: 13
---

# Source-Package Template

Use this template when a module has its own `package.json` and build pipeline,
but must be consumed by host runtime as prebuilt artifact.

## Minimal structure

```text
modules/
  mod.analytics/
    module.json
    package.json
    scripts/build.mjs
    tests/module-contract.test.mjs
    src/
      manifest.ts
      templates/
        defaults.json
        overrides.json
    dist/
      manifest.js
      templates/
        defaults.json
        overrides.json
```

## `module.json` template

```json
{
  "moduleId": "mod.analytics",
  "version": "0.1.0",
  "moduleMode": "source-package",
  "entry": "dist/manifest.js",
  "buildCommand": "pnpm build",
  "testCommand": "pnpm test:module",
  "sdkRange": "^0.1.0",
  "templatePack": {
    "defaultEntry": "dist/templates/defaults.json",
    "overrideEntry": "dist/templates/overrides.json",
    "contractRange": "^1.0.0"
  }
}
```

Required fields for `source-package`:

- `moduleMode`
- `entry`
- `buildCommand`
- `sdkRange`
- `testCommand` (recommended, optional)

Optional CTC fields:

- `templatePack.defaultEntry`
- `templatePack.overrideEntry`
- `templatePack.contractRange`

If `templatePack` is declared:

- at least one entry (`defaultEntry` or `overrideEntry`) must be present
- `modules:build` validates those output files exist after `buildCommand`
- `modules:prepare` validates those files exist before generating module registry metadata

## `package.json` template

```json
{
  "name": "mod.analytics",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node ./scripts/build.mjs",
    "test:module": "node --test ./tests/*.test.mjs"
  },
  "peerDependencies": {
    "@skitsaas/sdk": "^1.1.3",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

`modules:build` validates these critical peers:

- `react`
- `react-dom`
- `next`
- `@skitsaas/sdk`

## `<module-root>/scripts/build.mjs` template

```js
import { buildSourcePackageModule } from '@skitsaas/sdk/build';

buildSourcePackageModule({
  moduleId: 'mod.analytics'
});
```

This helper:

- transpiles `.ts/.tsx/.jsx` from `src/` into `.js` in `dist/`
- copies static assets (`.js/.mjs/.cjs/.json/.css`)
- validates that `dist/manifest.js` exists
- works best with extensionless local imports (for example `./data` instead of `./data.ts`)

## `<module-root>/tests/module-contract.test.mjs` template

```js
import test from 'node:test';
import { runSourcePackageTestSuite } from '@skitsaas/sdk/testing';

test('module contract', async () => {
  await runSourcePackageTestSuite({
    moduleId: 'mod.analytics'
  });
});
```

Use custom assertions in the same test file for module-specific behavior.

## `src/manifest.ts` template

```ts
import { defineModule, type ModuleManifest } from '@skitsaas/sdk';

export default defineModule({
  moduleId: 'mod.analytics',
  version: '0.1.0',
  displayName: 'Analytics',
  templatePack: {
    contractRange: '^1.0.0',
    defaults: [{ componentId: 'ui.table', templateId: 'mod.analytics.default.table' }],
    overrides: [{ componentId: 'ui.async-submit-button', templateId: 'mod.analytics.override.async-submit' }]
  }
} satisfies ModuleManifest);
```

`templatePack` in manifest is what CTC runtime registers for template resolution.
The optional `module.json.templatePack` section is a build/prepare artifact validation contract.

## Author checklist

- [ ] `moduleMode` is `source-package`.
- [ ] `buildCommand` builds the module from module root.
- [ ] Build outputs compiled manifest at `entry`.
- [ ] Optional `testCommand` runs module checks after build (`modules:build`).
- [ ] If module uses TypeScript, sources are under `src/*.ts|tsx` and emitted into `dist/*.js`.
- [ ] `sdkRange` is compatible with host SDK (`app/sdk/package.json`).
- [ ] Critical peers exist in `peerDependencies` and match host versions.
- [ ] If `templatePack` is declared in `module.json`, build emits the referenced `dist/templates/*` files.
- [ ] If module uses CTC templates, `templatePack` entries in manifest use valid `componentId` values.
- [ ] `pnpm modules:build -- --module=<moduleId>` passes.
- [ ] `pnpm modules:prepare` passes.
- [ ] `pnpm modules:i18n` passes (if module ships translations).
- [ ] `pnpm modules:migrate -- --module=<moduleId>` passes (if module owns DB migrations).
- [ ] `pnpm modules:sync` keeps runtime module state consistent.

## Validation flow

```bash
pnpm modules:build -- --module=mod.analytics
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate -- --module=mod.analytics
pnpm modules:sync
```

## Notes

- `source-package` does not allow runtime fallback to source entry.
- Host imports only compiled `entry` for this mode.
- If you need host transpilation, use `moduleMode: source-host` instead.
- Full reference module in this repo: `modules/mod.example.package`.
