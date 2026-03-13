# Verification

Run the commands that match the module mode and features touched by the task.

## Universal

```bash
pnpm modules:prepare
pnpm exec tsc --noEmit
```

## Source-package module

```bash
pnpm modules:build -- --module=mod.<id>
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate -- --module=mod.<id>
pnpm modules:sync
```

Boundary checks:

```bash
rg -n "from '@/|from \"@/" modules/mod.<id>
rg -n "@/app|@/lib|@/components|@/config" modules/mod.<id>
```

Both greps must return zero matches for a boundary-safe `source-package`.

## Forms and actions

Use when the task touched CRUD/settings/delete flows:

```bash
pnpm check:buildform
rg -n "adminAction|dashboardAction|@/lib/forms|@/components/ui/build-form|@/components/ui/template-build-form" modules/mod.<id>
```

If the module is intentionally `source-host`, a host UI renderer import is
still a special-case exception. It is no longer required for BuildForm parity.

## API and rate limiting

Manual checks:

- unauthenticated request returns the expected 401 or redirect path
- wrong role returns the expected 403 or redirect path
- repeated requests trigger the expected 429 when rate limiting was added

Implementation checks:

```bash
rg -n "@/lib/routing/rate-limit|adminAction|dashboardAction" modules/mod.<id>
```

## Portal

```bash
pnpm modules:prepare
pnpm exec tsc --noEmit
```

Manual checks:

- `/<portalName>` or `/dashboard/<portalName>` renders with portal layout
- protected portal routes redirect unauthenticated users correctly
- wrong-role users are redirected correctly
- `/portal-internal/*` returns 404
- every `.page()` path in `portal-init.ts` has a matching named route in `routes.ts`

## Release closeout

Before calling the work done:

- module README exists and reflects the current routes/config/SDK range
- any SDK gap discovered during implementation was escalated instead of patched
  with direct core imports
- tests or validation blockers are stated explicitly if they could not be run
