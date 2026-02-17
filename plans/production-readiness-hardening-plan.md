# Plan: Production Readiness Hardening

Status: In progress  
Start date: 2026-02-16  
Current phase: Phase B-C validation  
Last review: 2026-02-16

## Objective
Close the production blockers detected in the technical audit, preserving current behavior where possible and reducing security and operational risk.

## Scope
- Security hardening for auth, deploy and dependencies.
- Production deploy safety.
- CI quality gates for pull requests/pushes.
- Completion of pending invitation email flow.

## Out of Scope
- New product features unrelated to the findings.
- UI redesign.
- Refactor of modules/themes architecture beyond required fixes.

## Locked priority order
1. P0 - Prevent production seed/default credentials exposure.
2. P1 - Fix admin login routing conflict in proxy guard.
3. P1 - Remediate high vulnerabilities in runtime dependencies.
4. P2 - Add deploy surface modes (`full`, `dashboard-only`, `admin-only`) and hard-disable non-target areas.
5. P2 - Handle invalid session cookies/JWTs without API 500s.
6. P2 - Add CI quality gate and standard scripts (`lint`/`test`).
7. P3 - Complete invitation email flow.

---

## Task 1 (P0): Prevent production seed/default credentials exposure

### Risk
Production build currently runs seeding path that can create default credentials if env vars are missing.

### Target files
- `scripts/vercel-build.mjs`
- `package.json`
- `lib/db/seed.ts`
- `README.md`
- `docs/env-variables.md`

### Checklist
- [x] Split deploy scripts so production uses migrations only (no automatic seed).
- [x] Change Vercel production build flow to call migration-only path.
- [x] Keep `db:seed` as explicit/manual operation for non-production or controlled bootstrap.
- [x] Add hard guard in `lib/db/seed.ts` to refuse running in production unless explicit override is set.
- [x] Block known defaults (`test@test.com`, `admin123`) in production mode.
- [x] Document secure bootstrap procedure and required env vars.

### Validation checklist
- [x] `pnpm build` succeeds locally.
- [x] Simulated production build path no longer executes seed automatically.
- [x] Manual seed still works in local/dev environments.

---

## Task 2 (P1): Fix admin login routing conflict in proxy guard

### Risk
`/admin/login` is treated as protected by `proxy.ts` and may redirect unauthenticated users away from admin login flow.

### Target files
- `proxy.ts`
- `app/(login)/admin/login/page.tsx`
- `app/(login)/sign-in/page.tsx`
- `tests/auth/proxy-guards.test.ts` (new)

### Checklist
- [x] Introduce explicit public auth route allowlist in proxy (`/admin/login`, `/login`, `/sign-in`, `/sign-up`).
- [x] Keep `/admin/*` protected except `/admin/login`.
- [x] Redirect unauthenticated `/admin/*` users to `/admin/login` (not `/sign-in`).
- [x] Keep `/dashboard/*` unauthenticated redirects to `/sign-in` or `/login` per expected flow.
- [x] Add automated tests for public/protected auth route behavior.

### Validation checklist
- [x] Unauthenticated access to `/admin/login` returns login page.
- [x] Unauthenticated access to `/admin` redirects to `/admin/login`.
- [x] Existing dashboard route protection remains intact.

---

## Task 3 (P1): Remediate high vulnerabilities in runtime dependencies

### Risk
`pnpm audit --prod --audit-level high` currently reports high vulnerabilities in `tar`, `axios`, and `qs`.

### Target files
- `package.json`
- `pnpm-lock.yaml`
- `README.md` (optional note for dependency policy)

### Checklist
- [x] Upgrade direct dependencies to patched versions where available:
  - `@tailwindcss/postcss` chain (`tar`)
  - `@paypal/paypal-server-sdk` chain (`axios`)
  - `stripe` chain (`qs`)
- [x] Add `pnpm.overrides` for patched minimums if transitive updates are blocked.
- [x] Reinstall dependencies and regenerate lockfile.
- [x] Re-run security audit and confirm no high vulnerabilities remain.
- [x] Re-run typecheck, tests, and production build after upgrades.

### Validation checklist
- [x] `pnpm audit --prod --audit-level high` exits clean.
- [x] `pnpm exec tsc --noEmit` passes.
- [x] `npx tsx --test tests/**/*.test.ts` passes.
- [x] `pnpm build` passes.

---

## Task 4 (P2): Add deploy surface modes and hard-disable non-target areas

### Risk
Current deployment always exposes both areas (`/admin` and `/dashboard`). For split deployments, hiding links is insufficient; routes/actions/APIs must be hard-blocked.

### Target files
- `lib/config/runtime-surface.ts` (new)
- `proxy.ts`
- `app/(dashboard)/admin/layout.tsx`
- `app/(dashboard)/dashboard/layout.tsx` (or nearest shared dashboard boundary)
- `app/(login)/admin/login/page.tsx`
- `app/(login)/login/page.tsx`
- `app/api/modules/[moduleId]/[[...slug]]/route.ts`
- `lib/modules/runtime.ts`
- `docs/env-variables.md`
- `README.md`
- `tests/auth/surface-mode.test.ts` (new)

### Checklist
- [x] Add env-driven mode flag, for example `APP_SURFACE_MODE=full|dashboard-only|admin-only` with default `full`.
- [x] Implement central helpers: `isAdminEnabled()`, `isDashboardEnabled()`, `isAreaEnabled(area)`.
- [x] Enforce hard route blocking in proxy:
  - block `/admin*` and `/admin/login` when admin is disabled.
  - block `/dashboard*`, `/login`, `/sign-up` when dashboard is disabled.
- [x] Guard area layouts/pages to avoid rendering disabled area content.
- [x] Ensure module alias routes and module API dispatchers reject disabled area access.
- [x] Add tests for each mode (`full`, `dashboard-only`, `admin-only`) covering route accessibility matrix.
- [x] Document recommended split-deploy model:
  - separate DB users/roles per environment,
  - distinct secrets,
  - RLS policies enforced in DB (not app-only checks).

### Validation checklist
- [x] `dashboard-only` build/runtime never serves admin routes.
- [x] `admin-only` build/runtime never serves dashboard/public auth routes.
- [x] `full` preserves current behavior.
- [x] Proxy/layout/module routing behavior is consistent across modes.

---

## Task 5 (P2): Handle invalid session cookies/JWTs without API 500s

### Risk
Invalid/tampered session cookies can throw from JWT verification path and propagate to API handlers.

### Target files
- `lib/auth/session.ts`
- `lib/db/queries.ts`
- `app/api/user/route.ts`
- `app/api/team/route.ts`
- `tests/auth/session-invalid-cookie.test.ts` (new)

### Checklist
- [x] Add safe token verification helper (`tryVerifyToken`) that returns `null` on verification/parsing errors.
- [x] Update `getUser()` to use safe verification and never throw for invalid cookie input.
- [x] Keep authentication result semantics unchanged (`null` user when invalid).
- [x] Add tests for malformed/expired/forged token handling.
- [x] Confirm API routes depending on `getUser()` return stable responses instead of 500.

### Validation checklist
- [x] Invalid `session` cookie does not crash `/api/user`.
- [x] Invalid `session` cookie does not crash `/api/team`.
- [x] Existing valid session path remains unchanged.

---

## Task 6 (P2): Add CI quality gate and standard scripts

### Risk
No PR/push CI gate currently enforces typecheck/tests/lint before merge.

### Target files
- `package.json`
- `.github/workflows/ci.yml` (new)
- `.github/workflows/canary-evidence.yml` (no behavior change expected)
- `README.md`

### Checklist
- [x] Add standard scripts in `package.json`:
  - `typecheck`
  - `test`
  - `lint`
  - `check` (aggregated gate)
- [x] If lint stack is missing, add minimal compatible setup (Next/TypeScript).
- [x] Create CI workflow for `push` and `pull_request` running install + `pnpm check`.
- [x] Keep canary workflow as complementary observability job, not merge gate replacement.
- [x] Document required checks for protected branches.

### Validation checklist
- [x] `pnpm check` works locally.
- [ ] New CI workflow passes in a PR run.
- [ ] Failure in typecheck/test/lint blocks merge.

---

## Task 7 (P3): Complete invitation email flow

### Risk
Team invitation currently creates DB record but does not send email with invite link.

### Target files
- `app/(login)/actions.ts`
- `lib/email/smtp.ts`
- `lib/email/templates/template-invitation.ts` (new)
- `lib/i18n/messages/dashboard.ts` (if invitation copy is localized)
- `tests/auth/invite-team-member.test.ts` (new)
- `docs/features.md`

### Checklist
- [x] Capture inserted invitation id (`returning`) in `inviteTeamMember`.
- [x] Build signup invite URL with `inviteId` and `BASE_URL`.
- [x] Add invitation email template (subject/html/text).
- [x] Send invitation email using existing SMTP pipeline (`sendSmtpEmail`).
- [x] Log/send failure handling without breaking invitation creation flow.
- [x] Add tests for success/failure branches and link format.
- [x] Update docs for invitation lifecycle and SMTP dependency.

### Validation checklist
- [ ] Invitation record is created with `pending` status.
- [x] Email is attempted with correct invite URL.
- [ ] User can complete signup via `?inviteId=...` link.

---

## Execution checkpoints

### Phase A (blocking release)
- [x] Task 1 complete
- [x] Task 2 complete
- [x] Task 3 complete

### Phase B (stability hardening)
- [x] Task 4 complete
- [x] Task 5 complete
- [ ] Task 6 complete

### Phase C (feature completeness)
- [ ] Task 7 complete

## Final acceptance criteria
- [ ] No critical/high production blocker remains from this audit.
- [ ] Build, tests and audit gates pass in CI.
- [ ] Production deploy path is safe by default.
- [ ] Admin and user auth flows are accessible and guarded correctly.
- [ ] Invitation flow is complete end-to-end with email delivery attempt.
