# mod.auth.passkey

Passkey/WebAuthn authentication module over the Auth Provider SPI.

## Scope

- Passkey provider integration (`passkey`) over Auth Provider SPI.
- WebAuthn challenge lifecycle and credential persistence.
- Passkey login policy integration across admin/dashboard areas.

## Ownership boundary

- Module owns:
  - Passkey provider start/callback implementation.
  - WebAuthn challenge lifecycle and credential persistence.
  - Module config parsing (`mod.auth.passkey.config`).
- Core owns:
  - Global provider registry and `/api/auth/providers/*` handoff.
  - Session model, token signing, revocation checks.
  - Area auth policy (`AUTH_ADMIN_LOGIN_METHODS`, `AUTH_DASHBOARD_LOGIN_METHODS`) and break-glass policy.

## Provider registration

- Module id: `mod.auth.passkey`
- Provider id: `passkey`
- Kind: `passkey`
- Flow: `both` (`login` and authenticated account linking)

Provider dispatcher routes exposed by core:

- `GET|POST /api/auth/providers/passkey/start`
- `GET|POST /api/auth/providers/passkey/callback`

## Module API routes

All module routes are under:
`/api/modules/mod.auth.passkey/*`

- `GET /health`
- `GET /config` (admin auth required)
- `POST /registration/options` (user auth required)
- `POST /registration/verify` (user auth required)
- `GET|POST /authentication/options`
- `POST /authentication/verify`

## Runtime config

Namespace: `mod.auth.passkey.config`

- `enabled`
- `rp_id`
- `rp_name`
- `expected_origin`
- `require_user_verification`
- `challenge_ttl_seconds`
- `timeout_ms`

Notes:

- This module currently has no dedicated `AUTH_PASSKEY_*` env override keys.
- Runtime values are read from module config storage (`app_configs`) via SDK adapter.

## Host login policy integration

Passkey visibility/enforcement per area is controlled by host policy vars:

- `AUTH_ADMIN_LOGIN_METHODS`
- `AUTH_DASHBOARD_LOGIN_METHODS`

To enable passkey in an area, include `passkey` in that area's method list.

## Database tables owned by this module

- `mod_auth_passkey_challenges`
- `mod_auth_passkey_credentials`

## Security behavior

- Fail closed:
  - If disabled/misconfigured, auth routes return deterministic `503` with `passkey_provider_not_ready`.
- Challenge controls:
  - One-time challenge consumption.
  - Expiration (`challenge_ttl_seconds`) enforced server-side.
- Privilege controls:
  - Successful assertion only establishes session for an existing active user.
  - Admin redirect still requires app role (`owner` or `admin`), no claim-based escalation.

## Core hooks/adapters consumed

- `createModuleApiRouter`
- `getModuleConfigValue`
- `setSessionForUser`
- `parseJsonBody`

## Templates and CTC ids

This module does not register CTC template IDs. Passkey provider visibility is controlled by host login policy and host-rendered login templates.

## Validation

- `npx tsx --test tests/modules/auth-modules-scaffold.test.ts`
- `pnpm check`

## Troubleshooting

- `passkey_provider_not_ready`: verify `mod.auth.passkey.config` values (`rp_id`, `expected_origin`, `enabled`).
- Browser registration/auth failures: confirm RP ID and origin match the active host.
- Passkey option not visible in login: include `passkey` in `AUTH_{AREA}_LOGIN_METHODS`.
