---
title: Auth Provider SPI (Module Runtime)
sidebar_position: 14
---

# Auth Provider SPI (Module Runtime)

This document defines how modules can expose authentication providers (passkey, social OAuth, OIDC, SAML, etc.) through a shared host contract.

## Goal

Keep security-critical session behavior in core, while letting modules own provider-specific logic.

- Module owns: provider start/callback implementation and provider-specific config.
- Core owns: enabled-provider registry, route handoff, session issuance policy, and conflict handling.

## Manifest contract

`ModuleManifest` supports `authProviders` entries:

- `providerId` (global unique id, for example `google`, `passkey`)
- `kind` (`passkey`, `oauth2`, `oidc`, `saml`, `local`, `custom`)
- optional metadata (`displayName`, `description`, `flow`, `order`, `capabilities`)
- `routes`:
  - `startPath` (module API relative path)
  - `callbackPath` (module API relative path)
  - `healthPath` (optional module API relative path)

Example:

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

## Core registry behavior

- Registry source: enabled modules only (`app_modules.status='enabled'`).
- Duplicate `providerId` across enabled modules is fail-closed:
  - provider is excluded from runtime registry
  - issue is emitted in diagnostics (`duplicate_provider_id`)
- Provider order is deterministic (`order`, then `displayName`, then ids).

## Core API handoff routes

Core exposes provider-centric entrypoints:

- `GET/POST /api/auth/providers/[providerId]/start`
- `GET/POST /api/auth/providers/[providerId]/callback`

These routes resolve enabled provider metadata and forward to the module API handler route configured in `authProviders.routes`.

Current host-side guarantees on these handoff routes:

- provider registry conflict handling is fail-closed
- start and callback are both auth-rate-limited before module dispatch
- core issues a short-lived browser-bound handoff cookie on `start` and
  requires it on `callback` before the module handler runs
- core injects the handoff nonce into the module `start` request as the shared
  `state` seed (`getAuthProviderStartState(request)` in `@skitsaas/sdk/server`)
- callback dispatch forwards verification headers
  (`x-skitsaas-auth-provider-handoff-verified`,
  `x-skitsaas-auth-provider-handoff-nonce`) to the module request
- modules can validate the returned provider `state` with
  `validateAuthProviderCallbackState(request, state)` from
  `@skitsaas/sdk/server`
- rate-limited, denied, issued, and verified handoff decisions are logged
  through the core auth audit layer on a best-effort basis
- session issuance still belongs to core or SDK server adapters, not to the
  route bridge itself

Guidance:

- Prefer the SDK helper path above for normal OAuth/OIDC `state`.
- If a provider needs a richer signed payload, wrap or derive it from the
  shared core nonce instead of inventing an unrelated callback token.
- The browser-bound handoff cookie plus callback-side state validation gives the
  shared baseline for anti-CSRF and replay resistance across providers.

## Diagnostics API

Admin diagnostics endpoint:

- `GET /api/auth/providers`

Response includes:

- enabled provider registry (`providers`)
- conflict/issues list (`issues`)

This endpoint requires an authenticated admin role (`admin` by default; host-configurable through admin-area role setup).

## Module-owned auth docs

SPI contract lives in this core document.

Provider-specific implementation, configuration, and operational details do not belong in root `docs/`. Keep those details with each auth module instead of documenting them here.
