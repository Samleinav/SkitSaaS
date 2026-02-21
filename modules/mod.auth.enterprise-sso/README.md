# mod.auth.enterprise-sso

Enterprise SSO module for tenant-scoped OIDC and SAML providers over the Auth Provider SPI.

## Scope

- Tenant-scoped enterprise SSO providers (`enterprise-oidc`, `enterprise-saml`).
- OIDC/SAML start and callback orchestration through the provider SPI.
- Enterprise identity linking and claim mapping with fail-closed behavior.

## Ownership boundary

- Module owns:
  - Tenant/provider configuration resolution.
  - OIDC and SAML start/callback handling.
  - Claim mapping (subject/email/groups/role) and enterprise identity linking rules.
  - Tenant-scoped provider readiness/fail-closed checks.
- Core owns:
  - Provider registry + `/api/auth/providers/*` handoff.
  - Session token issuance/validation/revocation.
  - Global area auth policy and role guard enforcement.

## Provider registration

- Module id: `mod.auth.enterprise-sso`
- Providers:
  - `enterprise-oidc` (`kind: oidc`)
  - `enterprise-saml` (`kind: saml`)

Core dispatcher routes:

- `GET|POST /api/auth/providers/enterprise-oidc/start`
- `GET|POST /api/auth/providers/enterprise-oidc/callback`
- `GET|POST /api/auth/providers/enterprise-saml/start`
- `GET|POST /api/auth/providers/enterprise-saml/callback`

## Module API routes

All module routes are under:
`/api/modules/mod.auth.enterprise-sso/*`

- `GET /health`
- `GET /providers`
- `GET|POST /start/oidc`
- `GET|POST /callback/oidc`
- `GET|POST /start/saml`
- `GET|POST /acs/saml`
- `GET /connections` (user auth required)
- `GET /provider/oidc`
- `GET /provider/saml`

## Runtime config

Namespace: `mod.auth.enterprise-sso.config`

Shared keys:

- `enabled`
- `tenants`
- `default_tenant`
- `state_ttl_seconds`
- `callback_base_url`

Tenant keys use `tenant.<tenantId>.*`:

- `enabled`
- `domains`
- `organization_ids`
- `login_areas`
- `allow_jit_provisioning`
- `allow_email_linking`
- `require_verified_email`
- `allow_role_sync`
- `allow_role_elevation`
- `allowed_role_targets`
- `subject_claim_path`
- `email_claim_path`
- `email_verified_claim_path`
- `display_name_claim_path`
- `role_claim_path`
- `groups_claim_path`
- `role_map_json`
- `group_map_json`

OIDC keys (`tenant.<tenantId>.oidc.*`):

- `enabled`
- `client_id`
- `client_secret`
- `authorize_url`
- `token_url`
- `user_info_url`
- `issuer`
- `jwks_url`
- `scopes`
- `use_pkce`
- `verify_id_token`
- `state_ttl_seconds`
- `callback_base_url`

SAML keys (`tenant.<tenantId>.saml.*`):

- `enabled`
- `entity_id`
- `idp_entity_id`
- `sso_url`
- `x509_cert`
- `expected_audience`
- `metadata_xml`
- `metadata_url`
- `clock_skew_seconds`
- `state_ttl_seconds`
- `callback_base_url`

## Environment variable overrides

These override module config when present:

- `AUTH_ENTERPRISE_SSO_*`
- `AUTH_ENTERPRISE_SSO_{TENANT}_*`

Examples:

- `AUTH_ENTERPRISE_SSO_ENABLED`
- `AUTH_ENTERPRISE_SSO_TENANTS`
- `AUTH_ENTERPRISE_SSO_ACME_OIDC_CLIENT_ID`
- `AUTH_ENTERPRISE_SSO_ACME_SAML_X509_CERT`

## Host login policy integration

Enterprise providers are exposed through provider-based login policy (`social` method token).

Relevant host policy vars:

- `AUTH_ADMIN_LOGIN_METHODS`
- `AUTH_DASHBOARD_LOGIN_METHODS`
- `AUTH_ADMIN_SOCIAL_PROVIDERS`
- `AUTH_DASHBOARD_SOCIAL_PROVIDERS`
- `AUTH_DEFAULT_SOCIAL_PROVIDER`

Usage:

- Include `social` in `AUTH_{AREA}_LOGIN_METHODS` to allow enterprise provider login in that area.
- Allow-list enterprise providers by id with area filters:
  - `enterprise-oidc`
  - `enterprise-saml`

## Database tables owned by this module

- `mod_auth_enterprise_sso_states`

This module also reads/writes shared core identity table:

- `auth_external_identities`

## Security behavior

- Fail closed:
  - Tenant resolution failure -> blocked (`tenant_not_resolved`).
  - Disabled/misconfigured tenant/provider -> blocked (`tenant_not_available` / `provider_not_ready`).
- OIDC controls:
  - State + nonce checks.
  - PKCE support.
  - Optional ID token verification (`issuer`/`jwks`/`aud`/`nonce`).
- SAML controls:
  - One-time relay state consumption.
  - Assertion validation (issuer, audience, destination, request id, cert presence, time window).
- Privilege controls:
  - Claim mapping metadata is stored for audit.
  - Admin access still requires existing app role (`owner`/`admin`).
  - Provider claims do not auto-grant admin area access.

## Core hooks/adapters consumed

- `createModuleApiRouter`
- `getModuleConfigValue`
- `setSessionForUser`
- `parseJsonBody`

## Templates and CTC ids

This module does not register template IDs or CTC UI surfaces. Login UI rendering stays in host/core theme templates.

## Validation

- `npx tsx --test tests/modules/auth-enterprise-sso-module.test.ts`
- `pnpm check`

## Troubleshooting

- `tenant_not_resolved`: verify tenant/domain mapping in `mod.auth.enterprise-sso.config`.
- `provider_not_ready`: verify required OIDC/SAML config keys and provider enable flags.
- Login button not visible: confirm `social` is enabled in `AUTH_{AREA}_LOGIN_METHODS` and provider is allow-listed for the area.
