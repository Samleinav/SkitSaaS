---
name: core-operations-governance
description: Run, maintain, or extend operational validation packs, canary packs, activity log auditing, and documentation audit processes. Use this skill when validating a deployment, running operational checklists, or updating audit phase documentation.
---

# core-operations-governance

## Scope

Ops validation packs, canary packs, system activity logs, and documentation audit phases. DB security and auth SPI are out of scope — see `core-security-auth`.

## Required References

- `docs/operations/ops-validation-pack.md` — validation checklist structure and commands
- `docs/operations/ops-canary-pack.md` — canary deployment procedures
- `docs/operations/system-activity-logs.md` — `sys_activity_logs` schema, query patterns
- `docs/audit/documentation-audit-phases.md` — documentation audit phases and baseline snapshots

## Activity Logs

All platform events log to `sys_activity_logs`:

| Column | Value |
|--------|-------|
| `eventCategory` | `event_bus`, `auth`, `admin`, `payment`, etc. |
| `eventType` | Specific hook or action name |
| `actorUserId` | Authenticated user ID |
| `teamId` | Active team ID (if applicable) |

View at `/admin/logs`. Admin queries use `adminDb` via `lib/db/queries.admin.ts`.

## Ops Validation Pack

Run the validation pack before deploying:

```bash
# Reference: docs/operations/ops-validation-pack.md
pnpm modules:prepare         # module compat check
pnpm themes:prepare          # theme compat check
pnpm i18n:prepare            # i18n key conflict check
pnpm exec tsc --noEmit       # type safety
```

## Canary Pack

For deployments requiring staged rollout, follow `docs/operations/ops-canary-pack.md`.

## Documentation Audit

Documentation audit phases are tracked in `docs/audit/`. When completing a documentation update:
1. Update the relevant baseline snapshot in `docs/audit/`.
2. Mark the phase complete.
3. Note any coverage gaps for the next audit cycle.

## Escalation

- DB role security issues → `core-security-auth`
- Auth provider SPI → `core-security-auth`
- Event system ops → `core-events-hooks`
