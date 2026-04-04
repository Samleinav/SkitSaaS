---
title: "Module Data, Config, And I18n"
sidebar_position: 0
---

# Module Data, Config, And I18n

This page groups together the data and configuration concerns a module usually
needs once routing is already clear.

## Database Ownership

Module-owned DB assets should live inside the module:

```txt
modules/<moduleId>/db/migrations/*
modules/<moduleId>/db/schema.ts
modules/<moduleId>/db/seed.ts
```

Use the module migration pipeline, not the core migration pipeline, for
module-owned tables.

## Table Naming

Use module-prefixed tables such as:

- `mod_example_items`
- `mod_analytics_reports`

This keeps ownership clear and avoids collisions.

## Foreign Keys To Core Tables

Referencing core tables is allowed, but prefer local minimal stubs rather than
importing host schema files directly in module code.

This is especially important for portable module design.

## Config

For module-owned config values, use the module config layer exposed through the
SDK/host bridge instead of inventing an ad-hoc config store.

The host bootstrap in `lib/modules/sdk-server-bootstrap.ts` is what makes those
module config helpers work inside this host runtime.

## I18n

Default modern path for modules:

- flat translations
- SDK translator

Typical layout:

```txt
modules/<moduleId>/i18n/translations/<locale>.json
```

Use nested area message trees only when you intentionally need the older
structured compatibility contract.

## Dist Output For Portable Modules

For built or prebuilt module artifacts, emit i18n into `dist/` so the host can
read compiled assets without source fallback assumptions.

## Good Default Checklist

1. keep module-owned schema inside the module
2. use module-prefixed tables
3. avoid direct host schema imports in portable code
4. use flat SDK translation flow for new UI
5. document config and data ownership in the module README

## Common Mistakes

- adding module tables to host schema files
- reading host config internals directly from module code
- introducing new module UI that depends on the older structured i18n path by default
