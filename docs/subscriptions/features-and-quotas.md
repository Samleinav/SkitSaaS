---
title: Features and Quotas
sidebar_position: 5
---

# Features and Quotas

This guide explains how to create and use subscription features with scoped behavior:

- `user`: applies to the user (e.g. `dashboard.user.organizations.max`)
- `organization`: applies to the current organization/team (e.g. `dashboard.team.members.max`)

The template scope is defined in DB with `subscription_templates.target_scope`.

## Where they are defined

Central file:

- `lib/features/catalog.ts`

This file defines:

- official key
- `targetScope` (`user` or `organization`)
- value type (`boolean`, `number`, `text`, `null`)
- default
- minimum/maximum values (for numeric quotas)

## How to create a new feature

1. Add the key to `SUBSCRIPTION_FEATURE_KEYS`.
2. Create its typed definition (e.g. `NumberFeatureDefinition`).
3. Add it to `SUBSCRIPTION_FEATURE_DEFINITIONS`.
4. (Optional) expose it in a domain object such as:
   - `DASHBOARD_SUBSCRIPTION_FEATURES`
   - `USER_SUBSCRIPTION_FEATURES`

Naming convention:

- `dashboard.user.*` => scope `user`
- `dashboard.team.*` or `dashboard.organization.*` => scope `organization`

## How to use them in code

### 1) Resolve a controller by scope

```ts
import { getDashboardFeatureController } from '@/app/(dashboard)/dashboard/controller';

const orgFeatures = await getDashboardFeatureController('organization');
const userFeatures = await getDashboardFeatureController('user');
```

### 2) Evaluate flags/quotas

```ts
if (!orgFeatures.bool('dashboard.team.invites.enabled', true)) {
  return { error: 'Invites disabled' };
}

const maxMembers = orgFeatures.int('dashboard.team.members.max', null);
```

### 3) Recommended: use keys from the catalog

```ts
import { DASHBOARD_SUBSCRIPTION_FEATURES } from '@/lib/features/catalog';

const maxMembers = orgFeatures.int(
  DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key,
  DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.defaultValue
);
```

## Automatic validations in Admin

`app/(dashboard)/admin/subscriptions/actions.ts` normalizes managed features using the catalog:

- applies value type rules
- applies minimum/maximum constraints
- ignores managed features that do not match the template `targetScope`

## Useful helpers

- `lib/features/subscription.ts`
  - `getCurrentFeatureControllerByScope(scope)`
  - `getCurrentScopedFeatureController()`
- `lib/organizations/subscription-limits.ts`
  - helper for per-user organization quota (`dashboard.user.organizations.max`)

## Runtime source of truth

Current subscription state comes from `subscription_assignments`. The controller helpers resolve the active
assignment (user or team) and then apply the template features for that scope.

## Subscription checkout behavior (order-first)

Subscription purchases are executed through checkout orders (`checkout_orders`) and a tokenized route:

- discovery starts at `/pricing`
- checkout render happens at `/checkout/[checkoutToken]`
- payment execution uses `/api/checkout/[checkoutToken]/pay/[paymentMethodId]`

Important behavior:

- `/pricing` no longer mounts provider widgets per card.
- provider widgets are rendered in a single checkout context (`/checkout/[checkoutToken]`).
- duplicate start requests reuse an existing payable checkout order for the same subscription context.
- callback and webhook handling is routed through checkout payment-method dispatch (`/api/checkout/methods/*`), while legacy provider routes remain for compatibility.

## Subscription hierarchy and trial policy

Template hierarchy metadata is defined in `subscription_templates`:

- `category_key`: groups templates into the same plan family.
- `hierarchy_rank`: compares plans within the same category (`higher = upgrade`, `lower = downgrade`).

Trial eligibility is enforced per target and category through `subscription_trial_usage`:

- key dimension is `(target_type + target_team_id|target_user_id + category_key)`.
- a trial is consumed once at lifecycle projection time (when the subscription activation is applied).
- canceling and buying again in the same category does not grant a second trial.

Operational support note:

- when a customer reports missing trial, check recent subscription lifecycle logs for reason `trial_reuse_blocked`; this indicates prior consumption in the same `category_key` for the same target.

Checkout scope guard:

- `team` checkout accepts only templates with `target_scope='organization'`.
- `user` checkout accepts only templates with `target_scope='user'`.
- current self-service `/pricing` checkout is enabled only for `target_scope='organization'`.
- templates with `target_scope='user'` remain purchasable through admin/manual flows until a dedicated user self-service checkout path is enabled.

## Team invitation email flow

The dashboard team invitation action (`inviteTeamMember` in `app/(login)/actions.ts`) now completes the full flow:

1. Creates invitation row in `invitations` with `status='pending'`.
2. Captures the inserted invitation id (`returning`).
3. Builds signup URL as `${BASE_URL}/sign-up?inviteId={id}`.
4. Sends invitation email through SMTP pipeline (`lib/email/smtp.ts`) using:
   - template: `lib/email/templates/template-invitation.ts`
   - helper: `lib/email/invitations.ts`

Operational behavior:

- Invitation creation is the primary action; email delivery is best-effort and does not rollback invitation creation.
- SMTP success/failure is logged through the existing email logging path.
- `BASE_URL` should be configured in each environment so invitation links resolve to the correct deployment host.

## Auth: passkey module

Passkey auth now runs as a module (`mod.auth.passkey`) over the Auth SPI:

- provider start: `GET|POST /api/auth/providers/passkey/start`
- provider callback: `POST /api/auth/providers/passkey/callback`

Module behavior:

- stores WebAuthn challenge lifecycle in `mod_auth_passkey_challenges`
- stores passkey credentials in `mod_auth_passkey_credentials`
- enforces RP ID / origin validation and challenge expiry/one-time consumption
- issues internal host session after successful assertion verification

Operational notes:

- module runtime config lives in namespace `mod.auth.passkey.config` (`enabled`, `rp_id`, `rp_name`, `expected_origin`, `require_user_verification`, `challenge_ttl_seconds`, `timeout_ms`)
- start route can render an interactive passkey page (HTML) for browser-based login or return JSON options for API clients
- login method policy is still controlled per area by env (`AUTH_ADMIN_LOGIN_METHODS`, `AUTH_DASHBOARD_LOGIN_METHODS`)

## Auth: social login module

Social OAuth auth runs as module `mod.auth.social-logins` over the Auth SPI:

- provider start: `GET|POST /api/auth/providers/{providerId}/start`
- provider callback: `GET|POST /api/auth/providers/{providerId}/callback`
- supported providers in this phase: `google`, `github`, `x`

Module behavior:

- stores OAuth `state` + PKCE verifier in `mod_auth_social_oauth_states`
- consumes state once and rejects expired/replayed callbacks
- exchanges authorization `code` with provider token endpoint
- retrieves provider profile and links identity in `auth_external_identities`
- enforces verified-email policy for new login linking (existing linked identities still work)
- issues internal host session via SDK auth adapter (`setSessionForUser`)

Operational notes:

- module config namespace: `mod.auth.social-logins.config`
- env overrides are supported (`AUTH_SOCIAL_*`) for provider credentials and state settings
- admin and dashboard login policies still decide which providers appear/are usable per area
