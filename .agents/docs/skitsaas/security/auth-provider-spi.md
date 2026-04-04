---
title: "Auth Provider SPI"
sidebar_position: 0
---

# Auth Provider SPI

Use this page when the task is about modules exposing authentication providers
such as OAuth, OIDC, passkey, SAML, or other custom provider flows.

## Goal

Keep security-critical session policy in core while letting modules own
provider-specific start and callback behavior.

Responsibility split:

- module owns provider-specific implementation and provider config
- core owns registry, handoff routes, nonce/cookie policy, and conflict
  handling

## Manifest Contract

Modules can declare `authProviders` entries in `ModuleManifest`.

Important fields:

- `providerId`
- `kind`
- optional metadata such as `displayName`, `description`, `flow`, `order`,
  `capabilities`
- `routes.startPath`
- `routes.callbackPath`
- `routes.healthPath` when needed

Example shape:

```ts
authProviders: [
  {
    providerId: 'google',
    kind: 'oauth2',
    flow: 'both',
    routes: {
      startPath: '/start/google',
      callbackPath: '/callback/google',
      healthPath: '/health'
    }
  }
]
```

## Core Handoff Routes

The core host exposes provider-centric entrypoints:

- `GET|POST /api/auth/providers/[providerId]/start`
- `GET|POST /api/auth/providers/[providerId]/callback`

Those routes resolve enabled provider metadata and forward to the module API
paths declared in `authProviders.routes`.

## Core Guarantees

Current host-side guarantees include:

- enabled-provider registry only
- fail-closed duplicate `providerId` handling
- auth-rate-limited handoff routes
- short-lived browser-bound handoff cookie on `start`
- callback-side verification before module handler execution
- nonce/state helpers through the SDK server surface
- best-effort auth audit logging

## Registry Behavior

Registry rules:

- only enabled modules contribute providers
- duplicate `providerId` across enabled modules is fail-closed
- provider ordering is deterministic

Practical rule:

- provider conflict is a release blocker, not something to "pick one" at
  runtime

## SDK Helper Path

Useful server helpers include:

- `getAuthProviderStartState(...)`
- `getVerifiedAuthProviderCallbackState(...)`
- `validateAuthProviderCallbackState(...)`

That shared helper path is the preferred baseline for normal OAuth/OIDC style
state handling.

## Diagnostics

Admin diagnostics endpoint:

- `GET /api/auth/providers`

Expected output includes:

- enabled provider registry
- conflict/issues list

This is an admin-only diagnostics surface, not a public discovery endpoint.

## Boundary Rules

Keep these responsibilities in core:

- session issuance policy
- registry conflict handling
- baseline callback verification
- auth audit logging

Keep these responsibilities in the module:

- provider-specific remote API calls
- provider-specific configuration
- provider-specific start and callback business logic

## Common Mistakes

- letting modules issue sessions directly without the shared core path
- treating provider conflicts as harmless
- inventing unrelated callback tokens when the shared nonce/state path is
  already available

## Related Docs

- `../modules-and-sdk-boundaries.md`
- `../proxies-and-api-security.md`
- `../routing-and-route-factories.md`
