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

## Diagnostics API

Admin diagnostics endpoint:

- `GET /api/auth/providers`

Response includes:

- enabled provider registry (`providers`)
- conflict/issues list (`issues`)

This endpoint requires authenticated admin role (`owner`/`admin`).

## Module-owned auth docs

SPI contract lives in this core document.

Provider-specific implementation, configuration, and operational details do not belong in root `docs/`. Keep those details with each auth module instead of documenting them here.
