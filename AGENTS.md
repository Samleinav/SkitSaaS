# AGENTS.md

Quick guide for agents working in this repository (`saas-starter`).

## Project summary

- SaaS template with authentication, teams, subscriptions, and an admin panel.
- Next.js App Router structure (`app/(frontend)`, `app/(login)`, `app/(dashboard)`, `app/api`).
- Goal: iterate product features without rebuilding auth/db/payments boilerplate.
- /admin ( `app\(dashboard)\admin` ) area for administration admin level
- /dashboard [ `app\(dashboard)\dashboard` ]client area for users
- /, /pricing, /packs, /checkout/[checkoutToken] and /contact-us public area [ `app\(frontend)` ]
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
- `app/(frontend)/*`: public area (`/`, `/pricing`, `/packs`, `/checkout/[checkoutToken]`, `/contact-us`).
- `app/(frontend)/not-found.tsx`: frontend-scoped not-found renderer (theme-aware fallback).
- `app/(frontend)/modules/*`: frontend module dispatchers.
- `app/(frontend)/[...moduleAlias]`: frontend custom module alias resolver.
- `app/(frontend)/packs/page.tsx`: package comparison and commercial offering overview.
- `app/(dashboard)/*`: private area (`/dashboard`, `/admin`).
- `app/(dashboard)/dashboard/*`: team settings (general/activity/security).
- `app/(dashboard)/dashboard/not-found.tsx`: dashboard-scoped not-found renderer (theme-aware fallback).
- `app/(frontend)/pricing/*`: plan discovery and checkout start.
- `app/(frontend)/checkout/[checkoutToken]`: tokenized checkout page (single payment-method render context).
- `app/(dashboard)/admin/*`: admin (app config, users, subscriptions, payments).
- `app/(dashboard)/admin/app-config/modules/*`: admin modules runtime controls (`/admin/app-config/modules`).
- `app/(dashboard)/admin/not-found.tsx`: admin-scoped not-found renderer (theme-aware fallback).
- `app/(dashboard)/admin/modules/*`: admin module dispatchers.
- `app/(dashboard)/admin/[...moduleAlias]`: admin custom module alias resolver.
- `app/(dashboard)/dashboard/modules/*`: dashboard module dispatchers. 
- `app/(dashboard)/dashboard/[...moduleAlias]`: dashboard custom module alias resolver.
- `app/api/*`: server-side endpoints (user, team, notifications, webhooks, checkout).
- `app/api/forms/*`: generic BuildForm preflight validation endpoints.
- `app/api/auth/providers/*`: auth provider registry diagnostics + provider start/callback handoff.
- `app/api/modules/*`: module API dispatchers.
- `lib/db/*`: drizzle client, schema, queries, setup/seed.
- `lib/templates/*`: component template controller contract/runtime (CTC).
- `lib/payments/*`: Stripe/PayPal integrations and payment actions.
- `components/ui/*`: reusable shadcn/ui components.

## Documentation (Docusaurus)

- The `docs/` directory is used for product/architecture documentation in Docusaurus.
- When adding or changing features/quotas, also update the docs under `docs/`.
- Maintain both documentation tracks together:
  - human/web docs: the main Docusaurus-facing documentation under `docs/`
  - agent docs: the agent-oriented operational reference layer under `.agents/docs/skitsaas/*`
- When a change affects platform behavior, architecture, routes, SDK contracts, modules, themes, operations, or feature/quota rules, update both the human docs and the agent docs in the same task.
- Human docs should stay broader and explanatory; agent docs should stay execution-oriented with read order, decision rules, and worked examples.
- Do not leave one track updated and the other stale. If one track intentionally diverges, document the reason in the same task.
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

## Documentation-first exploration policy

This section is a repository-level priority rule for agents.

- Before exploring source code, read the relevant documentation in `docs/`.
- This applies especially to:
  - implementation plans
  - new module plans or scaffolding
  - SDK-first design decisions
  - routing/runtime questions
  - DB pattern questions
  - forms/datatables/template-system work
  - architecture or extension-point questions
- Do not start by grepping `app/`, `lib/`, `components/`, or `modules/` just to understand how the platform works if the answer should already exist in docs.
- For planning-only requests, default to docs-only discovery first. Do not inspect source unless the docs are missing, conflicting, or clearly insufficient for the requested plan.
- Treat `docs/` as the primary source of truth for platform structure, host/module boundaries, routing, SDK contracts, DB patterns, template runtime, and operational conventions.

### Required docs-first order

When the user asks for a plan, a new module, or architectural guidance, consult documentation in this order before opening source files:

1. `docs/00-documentation-index.md`
2. relevant core docs under `docs/core/*`
3. relevant SDK/runtime docs under `docs/sdk/*`, `docs/modules/*`, `docs/forms/*`, `docs/datatables/*`, `docs/subscriptions/*`
4. module-local docs:
   - `modules/<moduleId>/README.md`
   - `modules/<moduleId>/docs/*` when present
5. related `plans/*.md` files if the task is planning, rollout, migration, or hardening work

### When source inspection is allowed

Inspect source code only after the docs-first pass, and only when at least one of these is true:

- the task requires code changes or verification of current implementation status
- the docs do not answer a concrete question needed to proceed
- the docs appear outdated, ambiguous, or internally inconsistent
- the user asks about a specific file, function, route, or implementation detail
- you need to confirm whether a documented contract is already implemented or only planned

### Source inspection limits

If source inspection becomes necessary:

- inspect the minimum relevant files only
- prefer reading the files directly tied to the documented area instead of broad repo-wide exploration
- do not perform wide `rg` sweeps just to reconstruct architecture that docs already describe
- do not use source exploration as a substitute for reading the docs index and area docs first

### Planning rule for new modules

For requests like "create a plan for a new module", "scaffold a new module", or "design a module architecture":

- before planning or scaffolding, determine the target module mode first:
  - `source-host`
  - `source-package`
- if the user did not specify the module mode, ask explicitly before proceeding
- do not assume `source-host` or `source-package` silently for a new module request
- assume the docs are sufficient for the first planning pass
- produce the initial plan from docs + module READMEs + existing planning docs
- do not inspect unrelated source files to "learn the project"
- only inspect code later to validate a specific integration point or implementation gap

### Mandatory module-mode decision

For every new module request, agents must classify the module as either `source-host` or `source-package` before proposing structure, imports, build steps, or implementation tasks.

- If unspecified, ask the user which one they want.
- Do not draft a final module plan until that choice is clear.
- Treat the module mode as an architectural boundary, not as an implementation detail.

### Import boundary by module mode

Once the module mode is known, follow these rules strictly:

- `source-package`
  - must be SDK-only for host/platform capabilities
  - may use its own package.json, dependencies, and isolated build pipeline
  - must not import host internals such as `@/app/*`, `@/lib/*`, `@/components/*`, `@/modules/*`
  - must consume platform/runtime capabilities through `@skitsaas/sdk`, `@skitsaas/sdk/server`, `@skitsaas/sdk/db`, and other public SDK entrypoints only
  - design assumption: the module is independent from the host codebase and should remain portable

- `source-host`
  - may import host internals directly when necessary
  - must still prefer SDK contracts first for shared platform capabilities
  - should use direct core imports only for gaps, parity cases, or host-only runtime integrations not yet exposed by the SDK
  - should avoid unnecessary coupling to host internals when an SDK surface already exists
  - design assumption: even source-host modules should be written to migrate toward SDK-only usage later with minimal refactor

### SDK-first rule for source-host modules

For `source-host` modules, use this decision order:

1. check whether the capability already exists in the SDK
2. if yes, use the SDK import
3. if not, use a host import only when needed to move forward
4. if the gap is a reusable platform capability, plan or document the SDK gap so future migration is easier

Goal:

- keep `source-host` productive today
- keep migration to a fuller SDK low-friction tomorrow
- avoid baking unnecessary host-only imports into new module designs

### Conflict handling

If docs and code disagree:

- call out the conflict explicitly
- prefer docs for initial planning intent and platform conventions
- verify the implementation before making code changes
- update docs as part of the same task when the implementation is the intended source of truth
- if the documented behavior changes, sync both the human docs track and the agent docs track before closing the task

### Default agent behavior

- docs first
- source second
- minimal source reads
- no architecture discovery by grep when docs already cover it
- for plans, avoid code exploration unless strictly needed

## Planning files

- Use `plans/*.md` files to plan implementation work with agents and keep improvement actions traceable.
- Keep planning files actionable: objective, scope, phased tasks, dependencies/blockers, and completion criteria.
- Update related plan files when priorities or execution details change.

## Admin: route and action architecture

- Routes:
  - `/admin/app-config`
  - `/admin/app-config/modules`
  - `/admin/users`
  - `/admin/subscriptions`
  - `/admin/subscriptions/templates`
  - `/admin/subscriptions/templates/create`
  - `/admin/subscriptions/templates/[templateId]/edit`
  - `/admin/subscriptions/organization/[teamId]/edit`
  - `/admin/subscriptions/user/[userId]/edit`
  - `/admin/suscriptions` (legacy redirect)
  - `/admin/products` (module alias from a product-management module when enabled)
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
  - `app/(dashboard)/admin/app-config/modules/actions.ts`
  - `app/(dashboard)/admin/users/actions.ts`
  - `app/(dashboard)/admin/subscriptions/actions.ts`
  - `app/(dashboard)/admin/suscriptions/actions.ts` (legacy compatibility re-export)
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

### Persistent system notifications

- For persisted notifications targeted to:
  - all users (`global`)
  - one user
  - many users
  - a team (`all`, `members`, or `owner`)
- Core service:
  - `lib/notifications/service.ts`
- Core API:
  - `GET /api/notifications`
  - `POST /api/notifications/read`
  - `POST /api/notifications/dismiss`
- Area resolution:
  - notification `area='auto'` renders in `/admin` for admin-like users (`admin`/legacy `owner`)
  - notification `area='auto'` renders in `/dashboard` for other users
  - explicit `area='admin' | 'dashboard' | 'both'` bypasses auto targeting
- SDK usage:
  - client hook: `useNotifications()` from `@skitsaas/sdk`
  - server helpers: `createNotification()`, `notifyGlobal()`, `notifyUser()`, `notifyUsers()`, `notifyTeam()`, `notifyTeamMembers()`, `notifyTeamOwner()` from `@skitsaas/sdk/server`
- Host runtime:
  - `components/ui/notification-runtime.tsx` bridges persisted notifications into the toast UI and marks them as read after display.
  - backoffice themes should surface notification inbox UIs from `ui.user-menu`; baseline themes already mount a notification center there.

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
  - any task that changes core/host runtime or SDK plus module/business code must be split into separate commits:
    - one dedicated `core/sdk` commit containing only shared host/runtime/SDK/docs/tests changes intended to cherry-pick into `v1`
    - one later module/product commit for `school-saas` changes
  - do not mix `app/sdk/*`, shared host runtime, or core infrastructure changes into a module feature commit if the goal is to upstream them to `v1`
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
  - for new module requests:
    - agents must ask which `moduleMode` the user wants if it is not explicitly provided
    - do not choose silently
    - treat this as a required upfront decision because import boundaries, build pipeline, and plan shape depend on it
  - import boundary by mode:
    - `source-package`
      - use SDK entrypoints only for host/platform capabilities
      - forbidden: direct imports from `@/app/*`, `@/lib/*`, `@/components/*`, `@/modules/*`
      - intended to be independent, portable, and built from its own package pipeline
    - `source-host`
      - direct host imports are allowed when necessary
      - SDK remains the first choice for any capability already exposed publicly
      - prefer designing new code so it can migrate to SDK-only later without major rewrites
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

## Portal system

Portals are named, self-contained areas served at `/<portalName>/*` — completely independent from the marketing frontend layout. Each portal defines its own layout, pages, auth rules, and optional theme.

### Architecture

```
Request /hub/members
  → middleware (proxy.ts)
  → portalPrefixSet.has('hub') → true
  → executeProxyChain (auth enforcement)
  → NextResponse.rewrite('/portal-internal/hub/members')
  → app/(portal)/portal-internal/[...slug]/page.tsx
  → resolvePortalPage({ portalName: 'hub', slug: ['members'] })
  → portal layout + page (no marketing chrome)
```

Key files:
- `app/sdk/src/routing/portal.ts` — `RoutePortal`, `RouteApiPortal`, `PortalRouteBuilder`, registries
- `app/(portal)/portal-internal/[...slug]/page.tsx` — internal portal dispatcher (reached via middleware rewrite only)
- `lib/portals/runtime.tsx` — `resolvePortalPage()`, CSS injection, `{param}` pattern matching
- `lib/portals/all-portals.ts` → `lib/portals/all-portals.generated.ts` — page registry bootstrap (Node.js)
- `lib/portals/role-routing.ts` — `resolveRoleRedirect()` for post-login redirect
- `lib/routing/all-routes.generated.ts` — middleware proxy chain registration (edge)
- `proxy.ts` — detects `portalPrefixSet`, rewrites to `/portal-internal/...`, blocks direct access

### Module layout (two files, two contexts)

```
modules/mod.school/
  module.json          ← declare routesEntry + portalInit → auto-registered by modules:prepare
  src/
    routes.ts          ← EDGE: RoutePortal + .name() — proxy chain for middleware
    portal-init.ts     ← NODE.JS: .page() + .register() — page registry for dispatcher
```

`routes.ts` (edge-safe, no React):
```ts
import { RoutePortal, RouteApiPortal } from '@skitsaas/sdk';

export const SchoolRoute = RoutePortal('school');

SchoolRoute('').name('school.home');                        // public  → /school
SchoolRoute('students/{id}').auth().name('school.student'); // auth    → /school/students/{id}
SchoolRoute('reports').roles('teacher').name('school.reports'); // role → /school/reports

SchoolRoute.register({ /* NOT here, in portal-init.ts */ });

export const SchoolApi = RouteApiPortal('school');
export const GetStudents = SchoolApi('/students').GET().auth('user');
```

`portal-init.ts` (Node.js only, never import from edge files):
```ts
import { SchoolRoute } from './routes';

SchoolRoute('').page(() => import('../portal/school/home/page'));
SchoolRoute('students/{id}').page(() => import('../portal/school/students/[id]/page'));

SchoolRoute.register({
  layout: () => import('../portal/school/layout'),
  userTheme: false,             // or 'themeId' to inject a theme's CSS
  // coreCss: true              // default: loads frontend core CSS (globals + Tailwind)
  // coreCss: 'dashboard'       // loads dashboard core CSS instead
  // coreCss: false             // no core CSS — bring your own via head.css
  // head: { css: ['/extra.css'], js: [] }, // injected after core CSS
  isDefaultPortal: true,        // redirect all non-admin users here after login
  // redirectRoles: ['teacher'], // OR: restrict to specific role
});
```

`module.json` — auto-registration:
```json
{
  "routesEntry": "src/routes.ts",   // → lib/routing/all-routes.generated.ts
  "portalInit": "src/portal-init.ts" // → lib/portals/all-portals.generated.ts
}
```

Run `pnpm modules:prepare` after adding these fields. No manual edits to bootstrap files.

### Portal layout

```tsx
import type { PortalLayoutProps } from '@skitsaas/sdk';

export default function SchoolLayout({ children, portalCtx }: PortalLayoutProps) {
  // Full ownership of structure — no framework nav injected
  // portalCtx: { name, area?, context?, userTheme }
  return <div className="school-portal">{children}</div>;
}
```

### Portal page props

```tsx
type PageProps = {
  slug: string[];                                       // remaining path segments
  params: Record<string, string>;                       // {param} matches from path pattern
  searchParams: Record<string, string | string[] | undefined>;
};
```

### Post-login redirect

Priority order in `lib/portals/role-routing.ts`:
1. `canAccessAdmin` → `/admin`
2. `redirectRoles` match → `/<portalName>`
3. `isDefaultPortal: true` → `/<portalName>`
4. Fallback → `/dashboard`

### CSS loading

When `userTheme` is `false`, the runtime automatically loads the core CSS bundle before rendering:

| `coreCss` value | CSS loaded |
|---|---|
| *(omitted)* or `true` | `/.generated/core-assets/frontend/core-*.css` (globals + Tailwind) |
| `'dashboard'` | `/.generated/core-assets/dashboard/core-*.css` |
| `false` | nothing — use `head.css` to bring your own |

Extra CSS/JS URLs in `head: { css: [...], js: [...] }` are injected after the core bundle.

When `userTheme` is a string, `resolveAreaAssetHrefsBySelection` handles core + theme CSS automatically.

### Route precedence notes

- `portalPrefixSet` is populated in the edge context when `routes.ts` is imported by the middleware
- `/portal-internal/*` is blocked for direct user access; only reachable via internal rewrite
- Portal pages are served from `app/(portal)/` — they do NOT inherit `app/(frontend)/layout.tsx`
- `_`-prefixed folders are opted out of Next.js routing — use plain names like `portal-internal`
- `app/(frontend)/[...moduleAlias]` is for module routes only; portal check was removed from it

### Example module

`modules/mod.example.portal` — demonstrates all portal features with the `hub` portal name.
See `modules/mod.example.portal/README.md`.

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
- Admin server-rendered template tables also expose `section.admin.table.subscriptions.templates.cell` (`app/(dashboard)/admin/subscriptions/templates/page.tsx`).
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
  - `tests/modules/module-route-alias-context.test.ts`
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
  - `tests/forms/build-form-db-rules.test.ts`
  - `tests/forms/build-form-local-validation.test.ts`
  - `tests/forms/build-form-preflight-route.test.ts`
  - `tests/sdk/server-adapters.test.ts`
  - `tests/sdk/build-form-server-validation.test.ts`
  - `tests/sdk/build-form-validation-contract.test.ts`
  - `tests/sdk/build-forms.test.ts`
  - `tests/sdk/ui-notify.test.ts`
  - `tests/sdk/template-utils.test.ts`

## Multi-agent coordination

- When parallelizing work across multiple agents, create a root file named `p_tasks_{action_identification}.md`.
- Use that file to split ownership (`Agent 1`, `Agent 2`, etc.), list handoff notes, and track blockers/dependencies.
- Register unresolved work in `pendientes.md` and reference the related `p_tasks_{action_identification}.md` file.
