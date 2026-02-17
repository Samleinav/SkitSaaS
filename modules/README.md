# Example Modules

These are sample modules for quick verification of the module runtime.

## Available modules

- `mod.example.admin` -> admin page + nav
- `mod.example.dashboard` -> dashboard page + nav
- `mod.example.api` -> API handler (`/api/modules/mod.example.api/test`)
- `mod.example.suite` -> full example with DB tables, admin/dashboard pages, API, actions, widgets, and module settings
- `mod.example.package` -> full `source-package` example with own `package.json`, build command, DB, pages, API, actions, widgets, and module-owned UI (JS/CSS)
- `mod.auth.passkey` -> passkey/WebAuthn auth module (challenge + credential persistence, session handoff)
- `mod.auth.social-logins` -> social OAuth auth module (Google/GitHub/X with state + PKCE + secure linking)
- `mod.auth.enterprise-sso` -> tenant-scoped enterprise SSO module (OIDC + SAML callbacks, claim mapping, fail-closed readiness)

See `modules/mod.example.suite/README.md` for the full walkthrough.
Auth modules document their own setup/variables/behavior in:

- `modules/mod.auth.passkey/README.md`
- `modules/mod.auth.social-logins/README.md`
- `modules/mod.auth.enterprise-sso/README.md`

## Enable in the host app

The module registry generator scans:

1. `MODULES_DIR` env var (optional)
2. `/modules` (default)
3. `/examplemodules` (fallback)

So you can either:

- run `pnpm modules:prepare` / `pnpm modules:i18n` directly, or
- set `MODULES_DIR=examplemodules` explicitly.

Then enable the module ids in `app_modules` and hit the routes.

## Module mode contract

Each module should define `moduleMode` in `module.json`:

- `source-host`: host compiles source (`sourceEntry`).
- `prebuilt`: host loads compiled `entry`.
- `source-package`: module builds itself with `buildCommand`, then host loads `entry`.

For `source-package`, define critical peers in `package.json`:

- `react`
- `react-dom`
- `next`
- `@skitsaas/sdk`

Recommended pipeline before running app/build:

```bash
pnpm modules:build
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate
pnpm modules:sync
```

Author template and checklist:

- `docs/modules/13-source-package-template.md`

## Module DB migrations (phase-1)

If a module declares DB metadata in `module.json`:

```json
{
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

you can run module-scoped SQL migrations with:

```
pnpm modules:migrate
```

Useful flags:

- `--dry-run` to inspect detected migrations without DB writes
- `--module=<moduleId>` to run one module only
