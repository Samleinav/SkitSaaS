---
name: skss-module-authoring
description: Create or extend SkitSaaS modules end-to-end using the SKSS module runtime and SDK-first contracts instead of generic Next.js app routing or direct host-core imports. Use when asked to scaffold a module, add module pages, aliases, APIs, portals, FormBuilder-based CRUD, server actions, rate limits, widgets, migrations, config, i18n, or release checks. This skill chooses the correct topology (dispatcher, portal, or portal API), loads the narrower module skills in the right order, and stops work when the SDK surface is missing.
---

# skss-module-authoring

Use this as the entry skill for module work. It is the coordinator for the narrower
module skills and the guardrail against two recurring failure modes:

- falling back to generic Next.js filesystem routes instead of the SKSS module runtime
- reaching into `@/lib/*` or `@/components/*` instead of using the public SDK

## Non-negotiables

- Prefer `@skitsaas/sdk`, `@skitsaas/sdk/server`, `@skitsaas/sdk/db`,
  `@skitsaas/sdk/build`, and `@skitsaas/sdk/testing`.
- For `source-package`, never import `@/app/*`, `@/lib/*`, `@/components/*`,
  or `@/config/*`.
- Do not create host `app/` routes for normal module pages or `/api/modules/*`.
  Use the module manifest plus dispatcher runtime.
- Do not hand-roll CRUD or settings forms when the BuildForm contract fits.
  Define the form in module code and validate it with
  `createValidatedServerActionController`.
- Keep module form renderer imports on `@skitsaas/sdk` (`BuildForm` /
  `TemplateBuildForm`). Do not reach into host form wrappers for normal module
  parity.
- Do not use direct core imports as a shortcut for missing SDK surface.
  Escalate to `core-sdk-evolution` first.
- Keep portal `routes.ts` and `portal-init.ts` in sync. A missing named route
  means missing proxy enforcement.

## Workflow

1. Classify the request.
   - New module and the mode is unspecified: stop and ask whether it is
     `source-host` or `source-package`.
   - Existing `source-package` or reusable/distributable module: keep it
     boundary-safe and SDK-only.
   - Existing local app-only module that intentionally reuses host UI/runtime
     pieces: keep `source-host`, but justify each host import.
   - Portal change: keep the portal split inside the module. Do not invent pages
     in `app/(frontend)` or `app/(dashboard)` for portal screens.
2. Load the companion skills that match the work. See
   `references/companion-skills.md`.
3. Choose the route topology before writing files. See
   `references/topology-and-boundaries.md`.
4. Implement with SDK-first contracts.
5. Run the matching validation commands from `references/verification.md`
   before finishing.

## Mode selection

### Prefer `source-package`

Use `source-package` when the module should stay portable, isolated, and
upstreamable.

Start with:

- `mod-source-package-foundation`
- `mod-routing-api-permissions`
- `mod-testing-release`

Then add `mod-ui-forms-validation`, `mod-data-config-i18n`,
`mod-ui-datatables`, `mod-portal-authoring`, and `security-review`
only when the request needs them.

### Use `source-host` only on purpose

Use `source-host` when the request explicitly depends on host-only UI or runtime
pieces that are not yet exposed through the SDK.

Typical reasons:

- reusing unpublished host shadcn wrappers or theme-bound components
- depending on host-only runtime helpers that are not exposed through the SDK
- local-only module code that intentionally leans on host internals

Even in `source-host`:

- keep routing, API, config, DB, actions, rate limits, and validation SDK-first
- treat host imports as exceptions, not defaults
- if the same capability should be reusable by other modules, log the gap and
  switch to `core-sdk-evolution`

## Canonical references

Read only what is needed for the task.

Base docs:

- `docs/modules/00-overview.md`
- `docs/modules/02-runtime-routing.md`
- `docs/modules/03-permissions-actions.md`
- `docs/sdk/00-overview.md`

Canonical examples:

- `modules/mod.example.package/README.md`
- `modules/mod.example.package/src/manifest.js`
- `modules/mod.example.api/src/routes.ts`
- `modules/mod.example.api/src/manifest.ts`
- `modules/mod.example.portal/src/routes.ts`
- `modules/mod.example.portal/src/portal-init.ts`
- `modules/mod.example.suite/src/routes.ts`

## Example caveat

Some local `source-host` examples intentionally import host paths such as
`@/components/*` or `@/lib/*`. Use those examples for topology and UX ideas,
not as boundary-safe templates for `source-package`.

BuildForm is no longer a reason by itself to import host wrappers in module
code. Prefer SDK `BuildForm` / `TemplateBuildForm` even in `source-host`.

If the user says "prefer SDK over core imports", follow that preference even
when a local example takes a shortcut.

## Stop conditions

Stop module implementation and switch skills when:

- the module needs a capability that exists only in host internals:
  `core-sdk-evolution`
- the task changes shared host routing or proxy runtime:
  `core-routing-runtime`
- the task changes auth/provider/runtime security contracts:
  `core-security-auth`
- the task changes shared form/datatable/i18n runtime:
  `core-ui-systems`

## Delivery checklist

- All module files live under `modules/<moduleId>/` unless the topology
  explicitly requires a portal API wrapper under `app/api/<portalName>/*`.
- `module.json` declares the chosen module mode explicitly.
- Routes, APIs, forms, actions, proxies, and nav use the selected SKSS topology.
- Direct core imports are avoided or justified as intentional `source-host`
  exceptions.
- BuildForm renderer imports stay on `@skitsaas/sdk` unless the task is
  explicitly host-internal.
- Validation commands were run, or the blocker is stated clearly.
