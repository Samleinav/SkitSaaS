---
title: "Proxies And API Security"
sidebar_position: 0
---

# Proxies And API Security

This page is the practical security map for routing.

## The Main Split

`proxy.ts` protects page-like traffic.

`/api/*` is intentionally excluded from `proxy.ts` and must enforce security
through API route metadata, wrappers, or the module API dispatcher contract.

## Page-Side Enforcement

The page-side path is:

- `proxy.ts`
- `matchRouteProxyChain(pathname)`
- `executeProxyChain(...)`

Current area defaults are injected in `lib/routing/area-setup.ts`:

- admin -> `proxyAdmin`
- dashboard -> `proxyAuth`

Key files:

- `proxy.ts`
- `lib/routing/area-setup.ts`
- `lib/routing/proxies.ts`

## API-Side Enforcement

Typed API routes use route metadata plus host wiring:

- `.auth('user')` and `.auth('admin')`
- `.roles(...)`
- `.rateLimit(...)`
- `.proxy([...])`

Host glue:

- `configureApiAuthProxies(...)` in `lib/routing/area-setup.ts`

That is what makes typed API auth behave like a host-aware enforcement system
instead of a plain URL helper.

## BuildForm Preflight Security

BuildForm preflight is not protected by `proxy.ts`.

Instead it uses:

- same-origin verification
- area and access scope checks
- registered form metadata
- optional rate limiting

Key file:

- `lib/forms/security.ts`

Important detail:

- `isTrustedBuildFormPreflightRequest(request)` requires a valid `Origin`
  header and host match

## Module API Security

Module APIs go through:

- `app/api/modules/[moduleId]/[[...slug]]/route.ts`
- `lib/modules/runtime.ts`

They do not inherit page proxy chains automatically.

The module contract itself decides:

- auth requirement
- roles
- rate limits
- extra API proxies

## Public-Intentional Endpoints

Some endpoints are public by design because they depend on a different control
model, for example:

- auth provider start and callback
- payment return URLs
- payment webhooks
- public file serving when visibility is public

Public does not mean unguarded. It means the guard is not session-only.

Checkout-specific nuance:

- `/api/checkout/methods`
- `/api/checkout/[checkoutToken]/pay/[paymentMethodId]`
- legacy `/api/paypal/checkout`

These routes can be sessionless only for a live `signup_intent` checkout token.
Treat them as token-aware guarded routes, not as generally public APIs.

## Server Action Rule

Page access is not enough for mutations.

Server actions still need controller wrappers with server-side auth:

- `adminAction` or `adminValidatedAction`
- `dashboardAction` or `dashboardValidatedAction`

For SDK/module code, use SDK server action helpers instead of host-only
controllers.

## Rate Limiting

There are multiple rate-limit surfaces:

- typed API routes
- proxy-based rate limits
- BuildForm preflight limiter
- provider/webhook endpoints

The Redis-backed host backend is optional and configured at runtime.

## Never Assume These Things

- `/api/user` is not protected by `proxy.ts`
- a hidden route is not secure just because it is not linked in the UI
- a form rendered in admin is safe without an admin-wrapped server action
- a module API inherits host auth just because the page surface does
