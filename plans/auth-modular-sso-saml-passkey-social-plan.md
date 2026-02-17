# Plan: Modular Auth SPI + Passkey + Social + SAML

Status: In progress  
Start date: 2026-02-16  
Current phase: Phase B task 5 complete; Phase C task 6 complete, task 7 pending  
Last review: 2026-02-17

## Objective
Enable authentication as a modular capability (Passkey, Social/OAuth, future SAML/SSO), while keeping a secure internal session model and a break-glass admin path.

## Scope
- Core auth extensibility contract (Auth SPI) to be consumed by modules.
- Module-driven providers: Passkey and Social logins (Google/GitHub/X first).
- Future-ready SAML/OIDC module integration path.
- Break-glass admin policy with passkey-only local access.

## Out of Scope
- Fully production-ready WebAuthn/OAuth/SAML implementation in this phase.
- Replacing current session model with third-party sessions.
- IdP-specific enterprise onboarding UX polish.

## Locked priority order
1. P0 - Define and wire core Auth SPI (provider registry + callback handoff).
2. P0 - Add secure internal identity/session persistence model for external providers.
3. P1 - Harden break-glass admin with passkey-only local access.
4. P1 - Deliver production-ready passkey module over Auth SPI.
5. P1 - Deliver production-ready social login module over Auth SPI.
6. P2 - Deliver SAML/OIDC enterprise module.
7. P2 - Add test/observability/runbooks for auth provider lifecycle.

---

## Phase 0 (Bootstrap now): Module scaffolds

### Goal
Create baseline modules so auth flows can evolve from module boundaries, not hardcoded core flows.

### Target files
- `modules/mod.auth.passkey/*`
- `modules/mod.auth.social-logins/*`
- `tests/modules/auth-modules-scaffold.test.ts`
- `modules/README.md`

### Checklist
- [x] Add `mod.auth.passkey` scaffold (admin/dashboard aliases + API routes).
- [x] Add `mod.auth.social-logins` scaffold (provider catalog + API routes).
- [x] Add initial module config readers via SDK config adapter.
- [x] Add scaffold tests for health/providers routes.
- [x] Update modules catalog docs.

### Validation checklist
- [x] `npx tsx --test tests/modules/auth-modules-scaffold.test.ts` passes.
- [x] `pnpm check` passes with new module scaffolds.

---

## Task 1 (P0): Core Auth SPI contract and registry

### Risk
Without a stable core contract, each auth module will diverge in security/session behavior.

### Target files
- `app/sdk/src/modules/manifest.ts`
- `app/sdk/src/server.ts`
- `lib/auth/providers/*` (new)
- `lib/modules/runtime.ts`
- `docs/modules/*` (new auth extension doc)

### Checklist
- [x] Define `AuthProvider` contract in SDK/core (start/callback + metadata/capabilities).
- [x] Add module manifest extension for auth providers (non-breaking).
- [x] Add provider registry/loader in core (enabled modules only).
- [x] Add capability discovery API for admin diagnostics.
- [x] Document SPI and compatibility contract.

### Validation checklist
- [x] Core resolves provider list deterministically by enabled module set.
- [x] Disabled provider module is not callable.
- [x] Backward compatibility for existing modules is preserved.

---

## Task 2 (P0): External identity + session persistence model

### Risk
Auth provider callbacks need secure identity linking and revocation-aware sessions.

### Target files
- `lib/db/schema.ts`
- `lib/db/migrations/*` (new)
- `lib/auth/session.ts`
- `lib/db/queries.ts`
- `docs/database-model.md`

### Checklist
- [x] Add `auth_external_identities` table (`provider`, `subject`, `user_id`, metadata).
- [x] Add `auth_provider_connections` / `auth_sessions` revocation-friendly records.
- [x] Add session `jti`/`session_id` validation path (JWT + server-side revoke check).
- [x] Keep legacy cookie/JWT flows backward-compatible during migration.
- [x] Add data retention and revocation semantics in docs.

### Validation checklist
- [x] Linked identity survives re-login and maps to same user.
- [x] Revoked session cannot be reused.
- [x] Password/local login remains operational during migration.

---

## Task 3 (P1): Break-glass admin hardening (passkey-only local)

### Risk
If external IdP is unavailable, admin recovery path must exist and be strongly protected.

### Target files
- `lib/auth/*`
- `app/(login)/admin/login/*`
- `app/(dashboard)/admin/guards.ts`
- `docs/env-variables.md`

### Checklist
- [x] Define break-glass admin policy (single/small allowlist account set).
- [x] Enforce passkey-only login method for break-glass users.
- [x] Add rate-limit/lockout and auditable events for break-glass path.
- [x] Optionally support IP allowlist / emergency bypass toggles (env + docs).
- [x] Add per-area auth method policy (`admin` vs `dashboard`) with server-side enforcement and login UI adaptation.

### Validation checklist
- [ ] Break-glass user can access `/admin` with passkey when external IdP is down.
- [x] Break-glass user cannot authenticate with password.
- [x] Security logs contain clear break-glass audit trail.
- [x] Admin and dashboard can be configured with different login methods by env.

---

## Task 4 (P1): Passkey module (production-ready)

### Risk
WebAuthn requires strict origin/RP validation and challenge lifecycle controls.

### Target files
- `modules/mod.auth.passkey/*`
- `app/api/auth/providers/*` (if centralized callbacks are introduced)
- `tests/auth/*` + `tests/modules/*`
- `docs/features.md`

### Checklist
- [x] Implement challenge generation + persistence (`registration` and `authentication`).
- [x] Verify attestation/assertion and persist credentials per user.
- [x] Enforce RP ID/origin checks and challenge expiry windows.
- [x] Integrate provider callback result into internal session issuance.
- [x] Add admin diagnostics UI for provider status and credential stats.

### Validation checklist
- [ ] User can register passkey and authenticate successfully.
- [ ] Replay/expired challenge attempts are rejected.
- [x] Disabled provider returns deterministic blocked response.

---

## Task 5 (P1): Social login module (production-ready)

### Risk
OAuth state/nonce and provider-specific callback handling are attack-sensitive.

### Target files
- `modules/mod.auth.social-logins/*`
- `lib/auth/providers/*`
- `tests/auth/*` + `tests/modules/*`
- `docs/features.md`

### Checklist
- [x] Implement OAuth start URL generation with signed `state` + nonce.
- [x] Implement callback code exchange and provider profile retrieval.
- [x] Link/create user by provider subject + verified email policy.
- [x] Add provider enable/disable and credentials per environment.
- [x] Support initial providers: Google, GitHub, X; extensible provider adapter pattern.

### Validation checklist
- [x] Successful login flow for each enabled provider.
- [x] Invalid `state` or callback tampering is rejected.
- [x] Existing account linking policy works without account takeover risk.

---

## Task 6 (P2): Enterprise SAML/OIDC module

### Risk
Enterprise SSO requires tenant-aware config and secure assertion validation.

### Target files
- `modules/mod.auth.enterprise-sso/*` (new)
- `lib/auth/providers/*`
- `docs/features.md` + `docs/modules/*`

### Checklist
- [x] Add SAML/OIDC provider module scaffold over same Auth SPI.
- [x] Implement tenant/org-scoped IdP config and metadata handling.
- [x] Implement ACS/callback validation and claim mapping strategy.
- [x] Add role/group mapping policy hooks.

### Validation checklist
- [x] Tenant with configured IdP can complete SSO login.
- [x] Disabled/invalid IdP config fails closed.
- [x] Claim mapping does not elevate privileges unexpectedly.

---

## Task 7 (P2): Tests, observability, and runbooks

### Risk
Auth regressions are high impact and need deterministic gates.

### Target files
- `tests/auth/*`
- `tests/modules/*`
- `.github/workflows/ci.yml`
- `docs/ops-*` / auth runbooks (new)

### Checklist
- [ ] Add integration tests for provider start/callback/session issuance.
- [ ] Add security negative tests (state mismatch, replay, expired challenge).
- [ ] Emit structured auth lifecycle events for dashboards/alerts.
- [ ] Add incident runbook for IdP outage + break-glass usage.

### Validation checklist
- [ ] `pnpm check` includes auth provider tests and passes.
- [ ] CI catches auth regressions before merge.
- [ ] Runbook tested in a game-day style simulation.

---

## Execution checkpoints

### Phase A (foundational)
- [x] Task 1 complete
- [x] Task 2 complete

### Phase B (secure access continuity)
- [ ] Task 3 complete
- [ ] Task 4 complete
- [x] Task 5 complete

### Phase C (enterprise + operations)
- [x] Task 6 complete
- [ ] Task 7 complete

## Final acceptance criteria
- [ ] Auth providers can be added via modules without core auth rewrites.
- [ ] Internal session security controls remain centralized and enforced.
- [ ] Break-glass admin access is secure and auditable.
- [ ] Passkey + social login providers are production-ready.
- [x] SAML/OIDC module path is defined and validated.
