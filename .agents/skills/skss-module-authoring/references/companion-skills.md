# Companion skills

Load the minimum set that matches the request. Do not load everything blindly.

| Need | Skill | Why |
|---|---|---|
| New module skeleton, module mode, build pipeline | `mod-source-package-foundation` | Creates the correct `module.json`, `package.json`, manifest, and build/test pipeline for `source-package`. |
| Admin/dashboard/frontend aliases, page routers, APIs, permissions, quotas, rate limits | `mod-routing-api-permissions` | Covers dispatcher routing, typed API routes, auth, aliases, nav, and rate limiting. |
| CRUD/settings/delete forms and validated actions | `mod-ui-forms-validation` | Forces SDK BuildForm definitions and `createValidatedServerActionController`. |
| Standalone or dashboard portal | `mod-portal-authoring` | Covers `RoutePortal`, `portal-init.ts`, proxy chains, portal layouts, and portal redirects. |
| Module tables, runtime config, translations | `mod-data-config-i18n` | Covers migrations, `module.<moduleId>` config namespace, and module i18n pipelines. |
| List screens and CRUD tables | `mod-ui-datatables` | Covers SDK DataTable definitions and server CRUD helpers. |
| Module contract tests and release validation | `mod-testing-release` | Covers contract tests, build validation, migration checks, and release checklist. |
| API/auth/secrets review | `security-review` | Add this whenever the task touches auth, user input, APIs, secrets, or sensitive data. |
| Missing public SDK capability | `core-sdk-evolution` | Extend the SDK before using host internals as a workaround. |
| Shared routing/proxy runtime change | `core-routing-runtime` | Use this when the task is no longer module-local and changes host routing behavior. |
| Shared auth/provider/runtime security change | `core-security-auth` | Use this when module work crosses into host auth contracts. |
| Shared form/datatable/i18n runtime change | `core-ui-systems` | Use this when the task changes reusable host UI systems, not just a module implementation. |

Recommended order for a new reusable module:

1. `mod-source-package-foundation`
2. `mod-routing-api-permissions`
3. Add only the feature-specific skill(s) needed
4. `mod-testing-release`

Recommended order for a portal-heavy module:

1. `mod-source-package-foundation` or deliberate `source-host` decision
2. `mod-portal-authoring`
3. `mod-routing-api-permissions`
4. `mod-ui-forms-validation` / `mod-data-config-i18n` as needed
5. `mod-testing-release`
