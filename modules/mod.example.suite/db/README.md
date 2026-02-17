# mod.example.suite DB

This directory is the owner space for module database assets.

Planned structure:

- `migrations/` for module-scoped SQL migrations
- optional `schema.ts` for module-local ORM definitions
- optional `seed.ts` for idempotent seed logic

Current host behavior still relies on core migrations.
This folder is phase-1 scaffolding for the module-independent DB model.
