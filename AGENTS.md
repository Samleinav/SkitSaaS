# AGENTS.md

Quick guide for agents working in this repository (`saas-starter`).

## Project summary

- SaaS template with authentication, teams, subscriptions, and an admin panel.
- Next.js App Router structure (`app/(frontend)`, `app/(login)`, `app/(dashboard)`, `app/api`).
- Goal: iterate product features without rebuilding auth/db/payments boilerplate.
- /admin ( `app\(dashboard)\admin` ) area for administration admin level
- /dashboard [ `app\(dashboard)\dashboard` ]client area for users
- /, /pricing, /checkout/[checkoutToken] and /contact-us public area [ `app\(frontend)` ]
- /login (dashboard auth) and /admin/login (admin auth) in `app\(login)`
## Tech stack

- Framework: Next.js 16 (App Router + Turbopack)
- Database: PostgreSQL
- ORM: Drizzle ORM
- Payments: Stripe + PayPal (`@paypal/paypal-js`, `@paypal/paypal-server-sdk`)
- UI library: shadcn/ui (with Tailwind CSS)
- Datatables: TanStack Table (`@tanstack/react-table`) in admin

## Key structure

- `app/(login)/*`: auth routes and actions (`/login`, `/sign-up`, `/admin/login`, legacy `/sign-in` redirect).
- `app/(frontend)/*`: public area (`/`, `/pricing`, `/checkout/[checkoutToken]`, `/contact-us`).
- `app/(frontend)/not-found.tsx`: frontend-scoped not-found renderer (theme-aware fallback).
- `app/(frontend)/modules/*`: frontend module dispatchers.
- `app/(frontend)/[...moduleAlias]`: frontend custom module alias resolver.
- `app/(dashboard)/*`: private area (`/dashboard`, `/admin`).
- `app/(dashboard)/dashboard/*`: team settings (general/activity/security).
- `app/(dashboard)/dashboard/not-found.tsx`: dashboard-scoped not-found renderer (theme-aware fallback).
- `app/(frontend)/pricing/*`: plan discovery and checkout start.
- `app/(frontend)/checkout/[checkoutToken]`: tokenized checkout page (single payment-method render context).
- `app/(dashboard)/admin/*`: admin (app config, users, subscriptions, suscriptions, payments).
- `app/(dashboard)/admin/not-found.tsx`: admin-scoped not-found renderer (theme-aware fallback).
- `app/(dashboard)/admin/modules/*`: admin module dispatchers.
- `app/(dashboard)/admin/[...moduleAlias]`: admin custom module alias resolver.
- `app/(dashboard)/dashboard/modules/*`: dashboard module dispatchers. 
- `app/(dashboard)/dashboard/[...moduleAlias]`: dashboard custom module alias resolver.
- `app/api/*`: server-side endpoints (user, team, webhooks, checkout).
- `app/api/auth/providers/*`: auth provider registry diagnostics + provider start/callback handoff.
- `app/api/modules/*`: module API dispatchers.
- `lib/db/*`: drizzle client, schema, queries, setup/seed.
- `lib/templates/*`: component template controller contract/runtime (CTC).
- `lib/payments/*`: Stripe/PayPal integrations and payment actions.
- `components/ui/*`: reusable shadcn/ui components.

## Documentation (Docusaurus)

- The `docs/` directory is used for product/architecture documentation in Docusaurus.
- When adding or changing features/quotas, also update the docs under `docs/`.
- Use `docs/` for core developer-facing technical documentation (host implementation details, extension points, runtime behavior, and maintenance notes).
- For subscription features, use `docs/subscriptions/features-and-quotas.md` as the base guide (do not use it for module-specific feature docs).
- Keep docs technical by default: explain how something works and how developers should use/extend it.
- If docs are specifically for dashboard end users, place them under `docs/users/`.
- Module-owned documentation must stay in each module directory:
  - required: `modules/<moduleId>/README.md`
  - optional: `modules/<moduleId>/docs/*`
- Do not expand core docs with module-specific runtime config matrices, provider-specific env keys, or module operational runbooks; link to the module README/docs instead.
- Core technical references:
  - `docs/core/platform-capabilities.md`
  - `docs/core/architecture-routing-actions.md`
  - `docs/core/database-model.md`
  - `docs/core/env-variables.md`
  - `docs/subscriptions/features-and-quotas.md`
  - `docs/modules/*` (host-side module contracts/runtime only)

## Planning files

- Use `plans/*.md` files to plan implementation work with agents and keep improvement actions traceable.
- Keep planning files actionable: objective, scope, phased tasks, dependencies/blockers, and completion criteria.
- Update related plan files when priorities or execution details change.

## Admin: route and action architecture

- Routes:
  - `/admin/app-config`
  - `/admin/users`
  - `/admin/subscriptions`
  - `/admin/suscriptions`
  - `/admin/products` (module alias from `mod.commerce.products` when enabled)
  - `/admin/payments`
  - `/admin/orders`
  - `/admin/orders/create`
  - `/admin/modules/[moduleId]/[[...slug]]`
  - `/admin/[...moduleAlias]` (module custom aliases)
- Admin layout reuses the `(dashboard)` group: `app/(dashboard)/admin/layout.tsx`.
- Admin access guard (global `users.role='admin'` only): `app/(dashboard)/admin/guards.ts`.
- Existing deployments migration note (owner->admin):
  - before enabling admin-only guard in production, verify at least one global admin exists:
    - `select count(*) from users where role = 'admin' and deleted_at is null;`
  - if result is `0`, promote a trusted existing account:
    - `update users set role = 'admin' where email = '<trusted-email>' and deleted_at is null;`
- Dashboard module alias route: `/dashboard/[...moduleAlias]`.
- Frontend module canonical route: `/modules/[moduleId]/[[...slug]]`.
- Frontend module alias route: `/[...moduleAlias]` (only for non-core frontend paths).

### Action conventions

- Each subroute has its own actions:
  - `app/(dashboard)/admin/app-config/actions.ts`
  - `app/(dashboard)/admin/users/actions.ts`
  - `app/(dashboard)/admin/subscriptions/actions.ts`
  - `app/(dashboard)/admin/suscriptions/actions.ts`
  - `app/(dashboard)/admin/payments/actions.ts`
  - `app/(dashboard)/admin/orders/actions.ts` (if route-level mutations are added)
    - Includes `createPaymentOrderAction` (manual order create) and `updatePaymentOrderAction` (edit existing order)
- `app/(dashboard)/admin/actions.ts` is the global `/admin` entrypoint:
  - Re-exports actions by subroute.
  - Hosts global admin actions (if added in the future).

- Dashboard follows the same pattern:
  - `app/(dashboard)/dashboard/general/actions.ts`
  - `app/(dashboard)/dashboard/security/actions.ts`
  - `app/(dashboard)/dashboard/actions/team.ts`
  - `app/(dashboard)/dashboard/actions.ts` as global `/dashboard` entrypoint.

### Action controllers (admin/dashboard)

- Reusable base: `lib/actions/controller.ts`
  - Creates server action wrappers with:
    - centralized auth (`requireUser`)
    - convenient `FormData` parsing (`form.string`, `form.lower`, `form.positiveInt`, etc.)
    - optional action revalidation
- Admin:
  - `app/(dashboard)/admin/controller.ts`
  - helper: `adminAction(handler, { revalidate })`
- Dashboard:
  - `app/(dashboard)/dashboard/controller.ts`
  - helper: `dashboardAction(handler, { revalidate })`
  - utility: `revalidateDashboardRoot()`
- Recommendation:
  - for new CRUD actions (`create`, `edit`, `delete`, `save`), use `adminAction` or `dashboardAction` instead of duplicating parse/guard/revalidate logic.

### Frontend: form loading/feedback

- Base frontend submit component:
  - `components/ui/async-submit-button.tsx`
  - Uses `useFormStatus()` and provides visual feedback for:
    - `pending` state (spinner + loading label)
    - short completed state (checkmark)
- Recommended usage in `/admin` and `/dashboard`:
  - In forms with server actions (`<form action={...}>`), use `AsyncSubmitButton` instead of a plain `Button type="submit"` when immediate feedback is needed.
  - Main props:
    - `idleLabel`: normal button text
    - `pendingLabel`: request-time text (e.g. `Saving...`)
    - `successLabel` (optional): short completion text
    - `successDurationMs` (optional): success state duration
- If the action returns validation errors:
  - combine with `useActionState` to render error/success messages in the form.
  - `AsyncSubmitButton` handles loading UX; functional messages should still come from action state.

### Admin orders: manual subscription purchase flow

- Goal: create manual subscription purchase orders for either:
  - organization/team target
  - user target
- Create UI:
  - `app/(dashboard)/admin/orders/create/page.tsx`
  - `app/(dashboard)/admin/orders/create/create-order-form.tsx`
- Shared order form parsing/constants:
  - `app/(dashboard)/admin/orders/form-utils.ts`
- Backend creation action:
  - `createPaymentOrderAction` in `app/(dashboard)/admin/orders/actions.ts`
  - Validates target type + template scope alignment:
    - `targetType='team'` -> requires organization template
    - `targetType='user'` -> requires user template
  - Persists manual target metadata so lifecycle resolver can apply user/team subscription updates.
- Admin form options loader:
  - `lib/db/queries.ts` -> `getPaymentOrderFormOptionsForAdmin()`
  - Returns teams, templates, and active users for target selection.

### Frontend: notifications without forms

- For client-only notifications (no backend request), use:
  - `components/ui/notify.tsx`
  - `useNotify()` in client components
- API:
  - `notify.info(message)`
  - `notify.success(message)`
  - `notify.warning(message)`
  - `notify.error(message)`
  - `notify.notify({ title, message, tone, durationMs })` for full control
- `NotifyProvider` is mounted in `app/layout.tsx`, so hooks are available in `/admin`, `/dashboard`, and public pages.
- Do not hardcode warning/error copy in a fixed language; always use i18n messages (`useAreaMessages(...)` / server messages) when composing notification text.
- Common use case: prevent a click/submit and show an explanatory warning without calling a server action.

### Subscription feature controller

- Goal: evaluate limits/flags by plan using `feature_key` + `feature_value`.
- Central feature/quota catalog:
  - `lib/features/catalog.ts`
  - Official keys, value types, and quota minimums live here.
  - Rule: do not hardcode keys in actions/components; import them from this catalog.
- Reusable core:
  - `lib/features/controller.ts` -> `createFeatureController(source)`
  - API: `feature()`, `has()`, `can()`, `number()`, `int()`, `bool()`, `keys()`, `all()`
- Server loaders for subscriptions:
  - `lib/features/subscription.ts`
  - `getCurrentFeatureControllerByScope('user' | 'organization')`
  - `getCurrentScopedFeatureController()` (resolves scope by key prefix)
  - `getSubscriptionFeatureControllerByTemplateId(templateId)`
- Supporting queries:
  - `lib/db/queries.ts`
  - `getSubscriptionTemplateFeatureEntries(templateId)`
  - `getCurrentUserSubscriptionTemplateFeatureEntries()` (scope `user`)
  - `getCurrentOrganizationSubscriptionTemplateFeatureEntries()` (scope `organization`)

#### Recommended key conventions

- Use domain-based `dot.case` names, for example:
  - `dashboard.team.invites.enabled` -> boolean (`true/false`, `1/0`)
  - `dashboard.team.members.max` -> numeric limit (`3`, `10`, etc., with centralized minimum)
  - `dashboard.user.organizations.max` -> per-user organizations quota
- Use `has(key)` for flags.
- Use `can(key, required)` and `int/number(key)` for numeric limits.
- Recommended prefix scope mapping:
  - `dashboard.user.*` -> scope `user`
  - `dashboard.team.*` or `dashboard.organization.*` -> scope `organization`

#### Dashboard integration

- Dashboard actions can use `getDashboardFeatureController()` from:
  - `app/(dashboard)/dashboard/controller.ts`
- Current example:
  - `app/(dashboard)/dashboard/actions/team.ts` validates invite permissions and team member limits using keys/quotas from `lib/features/catalog.ts`.
- Admin integration:
  - `app/(dashboard)/admin/subscriptions/actions.ts` normalizes managed features against the catalog (type/value/minimum).
  - Enforce template scope: `dashboard.user.*` features must live in templates with `targetScope='user'`; `dashboard.team.*`/`dashboard.organization.*` must live in `targetScope='organization'`.
- User quota helpers:
  - `lib/organizations/subscription-limits.ts` resolves organization limits from `dashboard.user.organizations.max`.

### Modules: custom aliases and SDK evolution

- Modules can expose friendly routes using:
  - `adminRouteAliases`
  - `dashboardRouteAliases`
  - `frontendRouteAliases`
  - `frontendRouteAccess` (`public`, `user`, `admin`) for frontend module route guards
  - `frontendSlots` (`slotId` + `handler`) for embeddable frontend module content
- Friendly aliases can be used in nav items (for example `/admin/custom/analytics`), while `/admin/modules/[moduleId]/[[...slug]]` and `/dashboard/modules/[moduleId]/[[...slug]]` remain canonical dispatcher routes.
- Alias rules:
  - must stay in their area (`/admin/*`, `/dashboard/*`, or frontend aliases under `/*` that do not collide with core routes)
  - cannot collide with core routes (users, orders, app-config, dashboard settings, modules dispatcher)
  - cannot overlap with another module alias (overlap inside the same module is allowed; longest alias wins)
- Collision/format validation runs from the module registry at load time; treat validation errors as release blockers.
- Every module must include and maintain `modules/<moduleId>/README.md` as source of truth for module config, env overrides, routes, template IDs, and operational notes.
- SDK (`app/sdk/*`) is not a fixed contract forever:
  - when module development needs new primitives (route aliases, policies, helper types), evolve `app/sdk/src/*` first
  - rebuild SDK dist (`app/sdk/dist/*`) and update docs (`docs/sdk/*`, `docs/modules/*`) in the same task
  - keep host/runtime and SDK manifest types aligned (`lib/modules/manifest.ts` and `app/sdk/src/modules/manifest.ts`)
  - declare `sdkRange` in each module `module.json`; `pnpm modules:prepare` runs strict SDK compatibility checks by default (`--strict-compat`)
  - use `--warn-compat` only for local compatibility diagnostics without blocking
  - prefer importing Drizzle from `@skitsaas/sdk/db` inside modules, not directly from `drizzle-orm/*`
  - server adapters bootstrap lives in `lib/modules/sdk-server-bootstrap.ts` and is loaded via `instrumentation.ts`
  - current server adapter surface includes auth/session, revalidation, event emit, module config, database adapter (`getDb` + table lookup by alias/name), shared form/json parse helpers, and declarative module routers (`createModuleApiRouter`, `createModulePageRouter`) in `app/sdk/src/server.ts`
- Module metadata contract in `module.json`:
  - `moduleMode` is required and must be one of:
    - `prebuilt`
    - `source-host`
    - `source-package`
  - `source-package` must declare:
    - `entry` (compiled manifest path)
    - `buildCommand` (module build command)
    - `sdkRange`
  - `source-package` can optionally declare:
    - `testCommand` (module-local test command executed by `modules:build` after successful build)
    - `templatePack`:
      - `defaultEntry` and/or `overrideEntry` (at least one required if section exists)
      - `contractRange` (optional CTC compatibility hint)
    - critical peers in `package.json` `peerDependencies`:
      - `react`
      - `react-dom`
      - `next`
      - `@skitsaas/sdk`
  - CTC module integration:
    - module manifest (`ModuleManifest.templatePack`) is runtime source for module defaults/overrides
    - `modules:build` validates configured `module.json.templatePack` outputs exist after module build
    - `modules:prepare` validates configured `module.json.templatePack` entries and exposes metadata in generated module registry
  - `source-package` has no source fallback in `modules:prepare`; host consumes compiled `entry` only.
  - recommended module build helper for `source-package`: `@skitsaas/sdk/build` (`buildSourcePackageModule`) to transpile `.ts/.tsx/.jsx` and copy common assets from `src/` to `dist/`.
  - recommended module test helper for `source-package`: `@skitsaas/sdk/testing` (`runSourcePackageTestSuite`) to combine SDK contract checks with custom module assertions.
  - starter template/checklist for authors:
    - `docs/modules/13-source-package-template.md`
- Build/prepare pipeline order:
  - `modules:build -> modules:prepare -> modules:i18n -> modules:migrate -> modules:sync`
  - `modules:build` supports `--module=<id>` and `--dry-run` for targeted diagnostics.

## Getting started (local)

1. Install dependencies: `pnpm install`
2. Environment setup: `pnpm db:setup`
3. Run DB migrations: `pnpm db:migrate`
4. Seed initial data: `pnpm db:seed`
5. Run app: `pnpm dev`

Default seed user (if not changed in env):
- email: `test@test.com`
- password: `admin123`
- role: `admin` (can access `/admin`)

## Payments

- Stripe: checkout + webhook (`/api/stripe/*`)
- PayPal: subscriptions + webhook (`/api/paypal/*`)
- Canonical checkout payment API:
  - `POST /api/checkout/[checkoutToken]/pay/[paymentMethodId]`
  - `GET /api/checkout/methods`
  - `POST /api/checkout/methods/[paymentMethodId]/cancel`
  - `GET|POST /api/checkout/methods/[paymentMethodId]/return`
  - `POST /api/checkout/methods/[paymentMethodId]/webhook`
- `/api/stripe/*` and `/api/paypal/*` are compatibility routes during migration to `/api/checkout/*`; direct legacy usage is logged in system activity.
- The system can run with Stripe, PayPal, or both (based on configured env values).
- Central payment config in `lib/payments/config.ts` (env priority, DB fallback).

## Notes for agents

- In Next 16 with Cache Components, use compatible patterns for dynamic server data (`Suspense`, `connection()`, etc.) depending on context.
- Theme registry is generated by `pnpm themes:prepare` into:
  - `lib/themes/external.generated.ts`
  - `lib/themes/selection.generated.ts`
  - `lib/themes/code-registry.generated.ts`
  - `lib/themes/frontend-routes.generated.ts`
  - `lib/themes/assets.generated.ts`
  (runs in `predev`/`prebuild`).
- Area assets (`globalCss`, `script`, `additionalCss`, `additionalScript`, `ignoreCoreCss`, `ignoreCoreScript`, `favicon`, `notFoundTemplateByArea`) resolve from `ThemeConfig.assets` in `config.ts`.
- Area CSS/JS bundles are injected server-side through `components/theme/theme-area-assets.tsx`; `/admin/login` must follow `admin` area theme and `/login`/`/sign-up` must follow `dashboard` area theme.
- Theme `entryTemplates` are loaded by CTC runtime from `lib/templates/theme-pack.ts`; duplicate `componentId` per area is rejected.
- Module template packs are loaded by CTC runtime from `ModuleManifest.templatePack` (`lib/templates/module-pack.ts`) when `context.moduleId` is resolved.
- `ui.table` CTC pilot uses `components/ui/template-table.tsx` + `lib/templates/ui-table.ts` (payload keys: `containerClassName`, `tableClassName`).
- `ui.table.control` CTC slot wrapper is used by `components/ui/data-table.tsx` for granular controls (`toolbar.*`, `body.empty`, `pagination.*`) with `ThemeTemplate` fallback per slot.
- Generic TanStack datatable UI lives in `components/ui/data-table.tsx`; admin and dashboard wrappers pass `componentId` (`ui.table`), `themeId`, and `area` so the client datatable can load theme code templates from `lib/themes/code-registry.generated.ts` (with core fallback).
- Admin table column granular slots currently include `users`, `orders`, `subscriptions`, `payments`, `logs`, and `suscriptions.user` via `app/(dashboard)/admin/table-slot-template.tsx`.
- Admin server-rendered template tables also expose `section.admin.table.subscriptions.templates.cell` (`app/(dashboard)/admin/subscriptions/page.tsx`).
- Dashboard subscriptions datatable columns use `app/(dashboard)/dashboard/table-slot-template.tsx` with ids `section.dashboard.table.subscriptions.payments.cell` and `section.dashboard.table.subscriptions.invoices.cell`.
- Dashboard server-rendered organizations table also exposes `section.dashboard.table.subscriptions.organizations.cell` (`app/(dashboard)/dashboard/subscriptions/page.tsx`).
- `ui.async-submit-button` CTC pilot uses `components/ui/template-async-submit-button.tsx` + `lib/templates/ui-async-submit-button.ts` (payload keys: `className`, `iconClassName`).
- `ui.alert-dialog` CTC pilot in server routes uses `components/ui/template-confirm-submit-button.tsx` + `lib/templates/ui-alert-dialog.ts` (payload keys: `triggerClassName`, `contentClassName`, `titleClassName`, `descriptionClassName`, `footerClassName`, `cancelButtonClassName`, `confirmButtonClassName`).
- Shared private shell wrapper (`app/(dashboard)/private-area-shell.tsx`) is template-driven via `ThemeTemplate id="layout.private.shell"` and resolves theme by active area path (`/admin` vs `/dashboard`).
- Shared private top header (`app/(dashboard)/private-area-header.tsx`) is template-driven via `ThemeTemplate id="layout.private.header"` and resolves theme by active area path (`/admin` vs `/dashboard`).
- Private header user menu is template-driven via `ThemeTemplate id="ui.user-menu"` (`themes/first-backoffice/templates/ui.user-menu.tsx`).
- Admin dashboard core widgets are template-driven via section ids in `app/(dashboard)/admin/page.tsx`:
  - `section.admin.dashboard.overview`
  - `section.admin.dashboard.quick-links`
  - `section.admin.dashboard.recent-activity`
- Admin dashboard external module widgets are wrapped with `ThemeCodeTemplate id="section.admin.dashboard.module-widget"` in `app/(dashboard)/admin/page.tsx`.
- App-config root section nav granular wrappers in `app/(dashboard)/admin/app-config/section-nav.client.tsx`:
  - `section.admin.app-config-nav.panel`
  - `section.admin.app-config-nav.item`
- Admin datatable column UIs use `AdminTableSlotTemplate` (`app/(dashboard)/admin/table-slot-template.tsx`) with per-table ids:
  - `section.admin.table.users.cell`
  - `section.admin.table.orders.cell`
  - `section.admin.table.subscriptions.cell`
  - `section.admin.table.logs.cell`
  - `section.admin.table.suscriptions.user.cell`
- `ui.dialog` code-template pilot can wrap dialog UIs through:
  - server: `ThemeCodeTemplate id="ui.dialog"`
  - client: `ThemeTemplate id="ui.dialog"`
- Client routes can consume code-template equivalents through:
  - `components/ui/themed-async-submit-button.tsx`
  - `components/ui/themed-confirm-submit-button.tsx`
- For admin changes, prioritize domain separation (`users`, `subscriptions`) and avoid mixing actions.
- `admin/payments` is for completed payments (invoice-style preview + order relation); operational logs remain in `admin/orders` and `admin/logs`.
- Keep `AGENTS.md` up to date when routes/actions/docs conventions change.
- If you add, remove, or rename pages, update the route lists in this file (`Key structure`, `Admin: route and action architecture`) as part of the same task.
- Keep imports clearly separated between:
  - `queries` (reads)
  - `actions` (mutations)
  - `columns`/UI (datatable presentation)

## Tests

- When implementing or changing behavior, create/update tests if needed.
- For important processes/flows (payments, subscriptions, lifecycle changes, critical admin mutations), add/update tests by default.
- Prefer editing an existing test file when it already covers the same domain.
- If there is no suitable test, create a new one under `tests/` (do not place tests inside `app/`).
- Current files in `tests/`:
  - `tests/auth/invite-team-member.test.ts`
  - `tests/auth/proxy-guards.test.ts`
  - `tests/auth/session-invalid-cookie.test.ts`
  - `tests/auth/surface-mode.test.ts`
  - `tests/payments/order-subscription-lifecycle.test.ts`
  - `tests/modules/modules-build.test.ts`
  - `tests/modules/auth-provider-registry.test.ts`
  - `tests/modules/auth-modules-scaffold.test.ts`
  - `tests/modules/module-runtime.test.ts`
  - `tests/theme/theme-pack-manifest.test.ts`
  - `tests/theme/theme-pack-runtime.test.ts`
  - `tests/theme/theme-area-runtime.integration.test.ts`
  - `tests/theme/theme-code-template.test.tsx`
  - `tests/theme/theme-frontend-route.test.tsx`
  - `tests/theme/theme-assets-runtime.test.ts`
  - `tests/theme/theme-slot-data-contract.test.ts`
  - `tests/theme/theme-pack-import-boundaries.test.ts`
  - `tests/theme/theme-route-smoke.test.ts`
  - `tests/theme/theme-runtime.test.ts`
  - `tests/templates/template-contract.test.ts`
  - `tests/templates/template-controller.test.ts`
  - `tests/templates/template-host-module-theme.integration.test.ts`
  - `tests/templates/template-ui-table-payload.test.ts`
  - `tests/templates/template-ui-async-submit-button-payload.test.ts`
  - `tests/templates/template-ui-alert-dialog-payload.test.ts`
  - `tests/templates/template-module-pack.test.ts`
  - `tests/templates/template-theme-pack.test.ts`
  - `tests/sdk/server-adapters.test.ts`
  - `tests/sdk/template-utils.test.ts`

## Multi-agent coordination

- When parallelizing work across multiple agents, create a root file named `p_tasks_{action_identification}.md`.
- Use that file to split ownership (`Agent 1`, `Agent 2`, etc.), list handoff notes, and track blockers/dependencies.
- Register unresolved work in `pendientes.md` and reference the related `p_tasks_{action_identification}.md` file.
