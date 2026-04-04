---
title: "Permissions And Actions"
sidebar_position: 0
---

# Permissions And Actions

Use this page when a module needs page guards, API auth, rate limits, or
server-side mutations and the question is "where should the permission boundary
actually live?"

## Admin Module Pages

Admin dispatcher pages are protected before the module page handler runs.

In practice, admin module pages rely on the admin area guard path, so by the
time the module handler resolves:

- the user is authenticated
- admin access has already been enforced by the host

Important rule:

- if the module needs extra checks such as feature flags, team ownership, or
  plan gates, enforce them inside the module handler or a shared module helper

## Dashboard Module Pages

Dashboard dispatcher pages are lighter by default.

The host guarantees:

- authenticated user

It does not automatically guarantee:

- team membership
- custom business role
- plan quota
- module-specific ownership checks

Those belong in module-owned validation inside the page handler or shared
module service.

## Frontend Module Pages

Frontend module pages can declare:

- `frontendRouteAccess: 'public' | 'user' | 'admin'`

Use that when a frontend alias or dispatcher page should require a higher
baseline access level before the page logic runs.

Remember:

- `frontendRouteAccess` is the coarse gate
- module-specific business checks still belong in module code

## Module API Surfaces

Module API traffic is not protected by `proxy.ts`.

Use one of these two module API contracts:

1. typed `apiRoutes` with `RouteApi(...).METHOD()`
2. legacy `apiHandler` with `createModuleApiRouter(...)`

Preferred typed route example:

```ts
const AdminSyncRoute = RouteApi('/modules/mod.analytics/admin-sync')
  .POST()
  .auth('admin')
  .rateLimit({ limit: 10, windowSeconds: 60 })
  .name('mod.analytics.api.admin-sync');
```

Useful typed metadata:

- `.auth('user' | 'admin')`
- `.roles(...)`
- `.rateLimit(...)`
- `.proxy([...])`

That metadata is the first place to describe access, not a hidden comment in a
handler.

## Legacy Module API Router

Existing modules may still use:

- `createModuleApiRouter(...)`

That path is still valid, but it should be documented as legacy-compatible, not
the preferred default for new work.

## Server Actions In Modules

For module-owned mutations, prefer SDK-side action controllers from
`@skitsaas/sdk/server`:

- `createServerActionController(...)`
- `createValidatedServerActionController(...)`
- `requireUser()`
- `requireAdmin()`

Example pattern from the example package module:

```ts
const adminValidatedAction = createValidatedServerActionController({
  requireUser: async () => requireAdmin()
});
```

This is the module-friendly equivalent of the host wrappers.

## Host Wrappers Vs Module Wrappers

Host-only pages still use:

- `adminAction`
- `adminValidatedAction`
- `dashboardAction`
- `dashboardValidatedAction`

Those live in:

- `app/(dashboard)/admin/controller.ts`
- `app/(dashboard)/dashboard/controller.ts`

Module code should prefer the SDK action controller path so the auth boundary
stays portable.

## Rate Limiting

For typed module APIs, prefer `.rateLimit(...)` on the route definition.

For legacy or standalone module handlers, use:

- `withRateLimit` from `@skitsaas/sdk`

Avoid host-only rate-limit imports in module code.

## Practical Checklist

Before finalizing a permission-sensitive module feature, verify:

1. page auth and API auth are documented separately
2. coarse access lives in route metadata when possible
3. business checks live in the module handler or shared service
4. module actions use SDK controllers, not host-only wrappers
5. rate limiting is part of the API contract when the endpoint is sensitive

## Common Mistakes

- assuming module APIs inherit page-side proxy protections
- assuming dashboard dispatcher implies team or feature entitlement
- using host-only admin/dashboard wrappers inside portable module code
- documenting only the happy path and not the actual auth/rate-limit contract

## Related Docs

- `./pages-routing-and-api.md`
- `./navigation-widgets-and-notifications.md`
- `../proxies-and-api-security.md`
- `../routing-and-route-factories.md`
