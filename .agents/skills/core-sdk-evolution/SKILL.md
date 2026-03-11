---
name: core-sdk-evolution
description: Extend or version the @skitsaas/sdk package. Use this skill when adding new SDK exports, closing SDK gaps logged by modules, bumping SDK version, or migrating existing module code to SDK-first patterns.
---

# core-sdk-evolution

## Scope

`app/sdk/src/` source, SDK entry points, versioning (`sdkRange` compat), SDK gap resolution, and SDK-first migration guidance.

## Required References

- `docs/sdk/00-overview.md` — SDK entry points, exports, versioning rules, module modes
- `docs/sdk/01-sdk-first-migration.md` — step-by-step migration from host imports to SDK contracts
- `docs/reference/05-sdk-changelog.md` — SDK gap log and change tracking (read before and after every SDK change)

## SDK Entry Points

| Package | Usage |
|---------|-------|
| `@skitsaas/sdk` | Client-safe contracts, forms, datatables, routing, notifications, rate limiting |
| `@skitsaas/sdk/server` | Server helpers: auth, DB, events, notifications, server actions, form validation |
| `@skitsaas/sdk/db` | Drizzle query helpers + pg-core builders |
| `@skitsaas/sdk/build` | `buildSourcePackageModule` — source-package build script |
| `@skitsaas/sdk/testing` | `runSourcePackageContractChecks` — contract test runner |

## SDK Source Files

| File | Exports |
|------|---------|
| `app/sdk/src/index.ts` | Main `@skitsaas/sdk` barrel |
| `app/sdk/src/server.ts` | `@skitsaas/sdk/server` barrel |
| `app/sdk/src/forms.ts` | BuildForm types |
| `app/sdk/src/form-validation.ts` | Validation rules, `dbRef`, `fieldRef` |
| `app/sdk/src/notifications/types.ts` | Notification types |
| `app/sdk/src/modules/manifest.ts` | `defineModule`, `ModuleManifest` |
| `app/sdk/src/subscription-features.ts` | `SubscriptionFeaturesAdapter`, `checkFeature`, `getQuotaStatus`, `consumeQuota`, `QuotaExceededError` |
| `app/sdk/src/routing/rate-limit.ts` | `withRateLimit`, `checkRateLimit`, `configureRateLimitBackend` |
| `app/sdk/src/routing/api-route.ts` | `ApiMethodRouteBuilder.roles()`, `roleCheck` in `ApiAuthConfig` |
| `app/sdk/src/user-roles.ts` | `enrichUser`, `RichUser`, `UserContext`, `configureUserRoles`, `configureUserContext` |

## Adding a New SDK Export

1. Implement in the appropriate `app/sdk/src/*.ts` file.
2. Re-export from `app/sdk/src/index.ts` or `app/sdk/src/server.ts`.
3. If a new entry point is needed, add to `app/sdk/package.json` exports map.
4. Rebuild: `cd app/sdk && pnpm build`.
5. Refresh: `cd ../.. && pnpm install`.
6. Log the change in `docs/reference/05-sdk-changelog.md`.
7. Update `docs/sdk/00-overview.md` with the new export.

## Closing an SDK Gap

1. Find the gap entry in `docs/reference/05-sdk-changelog.md` (`type: gap`).
2. Implement the SDK contract (adapter interface in `app/sdk/src/`, host service in `lib/`, bootstrap wiring in `lib/modules/sdk-server-bootstrap.ts`).
3. Update the gap entry status to `published` and fill the `files` list.
4. Bump `app/sdk/package.json` version (MINOR for new exports, PATCH for fixes).
5. Rebuild SDK: `cd app/sdk && pnpm build && cd ../.. && pnpm install`.
6. Run `pnpm exec tsc --noEmit` — must pass.
7. Isolate SDK changes in a separate commit from module/product work (cherry-pick safe).

**Host service pattern** (for adapters that need DB access):
- Create `lib/<feature>/service.ts` with `import 'server-only'` + adapter implementation.
- Import and register in `lib/modules/sdk-server-bootstrap.ts` via the corresponding `configure*()` call.
- Never import `lib/<feature>/service.ts` from module code — modules only call the public SDK functions.

## SDK Versioning

Follows semver:
- `MAJOR`: breaking API changes for modules
- `MINOR`: backwards-compatible additions
- `PATCH`: backwards-compatible fixes

Modules declare `sdkRange` in `module.json` (e.g., `^1.3.5`). `pnpm modules:prepare` fails for incompatible ranges.

## SDK-First Migration Rule

When module code imports from `@/lib/*`, `@/app/*`, etc.:
1. Identify the capability needed.
2. Check if it exists in the SDK.
3. If not → log gap, implement SDK contract, then update module.
4. If yes → update module import to use SDK path.

Reference: `docs/sdk/01-sdk-first-migration.md`.

## Build + Verify

```bash
cd app/sdk && pnpm build        # compile SDK
cd ../.. && pnpm install        # refresh pnpm store
pnpm exec tsc --noEmit          # no type errors
pnpm modules:prepare            # sdkRange compat still valid
```
