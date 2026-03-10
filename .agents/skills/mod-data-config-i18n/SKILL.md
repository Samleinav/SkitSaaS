---
name: mod-data-config-i18n
description: Add database migrations, module config values, and i18n translations to a source-package module. Use this skill when creating module-owned tables, reading/writing app_configs, or adding module translation files.
---

# mod-data-config-i18n

## Scope

Module DB migrations, `app_configs` namespace for module config, and module i18n (area JSON + flat natural-key translations).

## Required References

- `docs/modules/04-database-migrations.md` — table naming, migrations directory, `modules:migrate` command
- `docs/modules/05-config.md` — `getModuleConfigValue`, `setModuleConfigValue`, `app_configs` namespace
- `docs/modules/12-i18n.md` — area JSON bundles, flat natural-key translations, `modules:i18n` pipeline

## DB Migrations

Table naming convention: `mod_<moduleId>_<name>` (underscores, no dots).

```
modules/<moduleId>/
  db/
    migrations/
      0001_create_items.sql
    schema.ts     (optional)
```

`module.json` must declare:

```json
{
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Run:

```bash
pnpm modules:migrate
pnpm modules:migrate --module=mod.<id>   # single module
pnpm modules:migrate --dry-run           # preview only
```

Always use `getAdminDb()` from `@skitsaas/sdk/server` to query module tables. Never import host `db` or `adminDb` directly.

## Module Config

Module-owned config lives under namespace `module.<moduleId>.*` in `app_configs`.

```ts
import { getModuleConfigValue, setModuleConfigValue } from '@skitsaas/sdk/server';

// Read
const apiKey = await getModuleConfigValue('module.mod.<id>', 'apiKey');

// Write
await setModuleConfigValue('module.mod.<id>', 'apiKey', 'sk-...');
```

Do not import `getAppConfigValueFromDb` or `upsertAppConfigEntry` from host paths in module code.

## i18n

### Area JSON (nested messages)

```
modules/<moduleId>/i18n/
  admin/en.json
  dashboard/en.json
  dashboard/es.json
```

```json
{
  "mod": {
    "mod.<id>": {
      "title": "My Module",
      "createItem": "Create Item"
    }
  }
}
```

### Flat Natural-Key Translations

```
modules/<moduleId>/i18n/translations/
  en.json
  es.json
```

```json
{
  "Create item": "Crear elemento",
  "Settings saved": "Configuración guardada"
}
```

Usage in module:

```ts
import { createTranslator } from '@skitsaas/sdk';
const t = createTranslator(translations, locale);
t('Create item'); // → "Crear elemento" in es
```

Build commands:

```bash
pnpm modules:i18n   # copies module i18n into host i18n bundle
pnpm i18n:prepare   # merges all sources (fails on key conflicts)
```

## Verification

```bash
pnpm modules:migrate --dry-run   # check migrations apply cleanly
pnpm modules:i18n && pnpm i18n:prepare  # check no key conflicts
rg -n "getAppConfigValueFromDb|upsertAppConfigEntry|from '@/lib/config" modules/<moduleId>
# must return 0 matches
pnpm exec tsc --noEmit
```
