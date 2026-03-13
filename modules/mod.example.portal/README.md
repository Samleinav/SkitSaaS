# mod.example.portal

Example module demonstrating the portal system in SKSS with a visibly module-owned portal shell.

## Scope

| Feature | File |
|---|---|
| `RoutePortal` factory + `.name()` | `src/routes.ts` |
| `RouteApiPortal` scoped API metadata | `src/routes.ts` |
| `.page()` + `.register()` (Node.js context) | `src/portal-init.ts` |
| Portal shell CSS owned by the module | `portal/hub/layout.tsx`, `portal/hub/portal-shell.tsx` |
| SDK `TemplateBuildForm` in portal page | `portal/hub/register/page.tsx` |
| SDK `DataTable` client wrappers for portal pages | `portal/hub/data-tables.tsx` |
| Public page (no auth) | `portal/hub/home/page.tsx` |
| Public registration page with SDK form/table | `portal/hub/register/page.tsx` |
| Auth-required member directory | `portal/hub/members/page.tsx` |
| Dynamic route `{id}` + auth | `portal/hub/members/[id]/page.tsx` |

## Module metadata

- `moduleId`: `mod.example.portal`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `routesEntry`: `src/routes.ts`
- `portalInit`: `src/portal-init.ts`
- `sdkRange`: `^1.7.1`

## Routes and API metadata

Implemented portal pages:

```text
/hub
/hub/register
/hub/members
/hub/members/{id}
```

Declared portal API metadata:

- `GET /api/hub/members`
- `GET /api/hub/members/{id}`

This example still does not ship host bridge files under `app/api/hub/*`, so those
portal API endpoints are metadata-only until the host adds the bridge files.

## Runtime behavior

- The portal now injects a module-owned visual shell from `portal/hub/layout.tsx`.
- `register/page.tsx` shows:
  - client-side `DataTable` wrapper for included features
  - SDK `TemplateBuildForm`
- `members/page.tsx` now uses a local SDK `DataTable` instead of a handwritten list.

## CSS loading

- `coreCss: true` still loads the frontend core CSS bundle.
- The module adds its own CSS layer on top through `portal/hub/portal-shell.tsx`, making the portal visibly module-owned without relying on a full theme pack.

## Database and migrations

- No module-owned DB tables.
- No module migrations.

## Tests and validation

```bash
pnpm modules:prepare
pnpm dev
```

Navigate to `http://localhost:3000/hub`.
