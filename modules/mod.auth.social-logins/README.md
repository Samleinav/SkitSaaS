# mod.auth.social-logins

Social OAuth authentication module over the Auth Provider SPI.

Supported providers in this module:

- `google`
- `github`
- `x`

## Ownership boundary

- Module owns:
  - Provider-specific OAuth start/callback flow.
  - OAuth state + PKCE lifecycle.
  - Profile mapping and identity linking rules for supported providers.
  - Module config and env override resolution.
- Core owns:
  - Auth provider registry and dispatcher endpoints (`/api/auth/providers/*`).
  - Session issuance and revocation-aware session checks.
  - Area auth policy and login UI policy wiring.

## Provider registration

- Module id: `mod.auth.social-logins`
- Providers: `google`, `github`, `x`
- Kind: `oauth2`
- Flow: `both`

Core dispatcher routes:

- `GET|POST /api/auth/providers/{providerId}/start`
- `GET|POST /api/auth/providers/{providerId}/callback`

## Module API routes

All module routes are under:
`/api/modules/mod.auth.social-logins/*`

- `GET /health`
- `GET /providers`
- `GET|POST /start/:providerId`
- `GET|POST /callback/:providerId`
- `GET /provider/:providerId` (admin auth required)
- `GET /connections` (user auth required)
- `POST /disconnect/:providerId` (user auth required)

## Runtime config

Namespace: `mod.auth.social-logins.config`

Shared keys:

- `oauth_state_ttl_seconds`
- `oauth_callback_base_url`

Per-provider keys (`provider.{providerId}.*`):

- `enabled`
- `client_id`
- `client_secret`
- `authorize_url`
- `token_url`
- `user_info_url`
- `email_info_url`
- `scopes`
- `use_pkce`
- `token_auth_method`

## Environment variable overrides

These override module config when present.

Shared:

- `AUTH_SOCIAL_STATE_TTL_SECONDS`
- `AUTH_SOCIAL_CALLBACK_BASE_URL`

Per-provider (`AUTH_SOCIAL_{PROVIDER}_*`, provider uppercased):

- `ENABLED`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `AUTHORIZE_URL`
- `TOKEN_URL`
- `USER_INFO_URL`
- `EMAIL_INFO_URL`
- `SCOPES`
- `USE_PKCE`
- `TOKEN_AUTH_METHOD`

Examples:

- `AUTH_SOCIAL_GOOGLE_CLIENT_ID`
- `AUTH_SOCIAL_GITHUB_CLIENT_SECRET`
- `AUTH_SOCIAL_X_SCOPES`

## Host login policy integration

Provider-based login rendering/selection for this module is controlled by host policy vars:

- `AUTH_ADMIN_LOGIN_METHODS`
- `AUTH_DASHBOARD_LOGIN_METHODS`
- `AUTH_ADMIN_SOCIAL_PROVIDERS`
- `AUTH_DASHBOARD_SOCIAL_PROVIDERS`
- `AUTH_DEFAULT_SOCIAL_PROVIDER`

Usage:

- Include `social` in `AUTH_{AREA}_LOGIN_METHODS` to allow provider login in that area.
- Use `AUTH_{AREA}_SOCIAL_PROVIDERS` to allow-list provider ids per area (`google`, `github`, `x`).
- Use `AUTH_DEFAULT_SOCIAL_PROVIDER` to set preferred provider ordering in login UI.

## Database tables owned by this module

- `mod_auth_social_oauth_states`

This module also reads/writes shared core identity table:

- `auth_external_identities`

## Security behavior

- Fail closed:
  - Disabled/misconfigured providers return deterministic blocked responses.
- OAuth state/nonce:
  - State is stored server-side and consumed once.
  - Replayed/expired callbacks are rejected.
- Account linking:
  - New login linking requires verified provider email.
  - Existing provider-subject links are reused.
  - Cross-user provider account collisions are rejected.
- Privilege controls:
  - Admin login redirect still requires local app role (`owner`/`admin`).

## Core hooks/adapters consumed

- `createModuleApiRouter`
- `getModuleConfigValue`
- `setSessionForUser`
- `parseJsonBody`

## Validation

- `npx tsx --test tests/modules/auth-modules-scaffold.test.ts`
- `pnpm check`
