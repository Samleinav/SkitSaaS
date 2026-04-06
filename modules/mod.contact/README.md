# mod.contact

Minimal `source-host` contact module for the public `/contact-us` page and an
operator-friendly admin inbox.

## Scope

- provides the frontend slot used by the host `/contact-us` page
- stores contact submissions in a module-owned table
- exposes a simple admin page to review recent messages
- keeps the implementation intentionally small: one form, one table, one admin
  screen

## Module id and entry

- `moduleId`: `mod.contact`
- `moduleMode`: `source-host`
- entry file: `src/manifest.ts`
- `sdkRange`: `^1.9.0`

## Routes

### Frontend integration

- host page: `/contact-us`
- slot id: `frontend.contact.form.primary`

The module does not own `/contact-us` as a route alias. The host page keeps the
public shell and the module provides the real form through the frontend slot.

### Admin alias

- `/admin/custom/contact`

### Canonical dispatcher route

- `/admin/modules/mod.contact`

## Database objects

Defined in `modules/mod.contact/db/schema.ts`:

- `mod_contact_submissions`

## Runtime behavior

- frontend:
  - validated contact form rendered through SDK `TemplateBuildForm`
  - stores `name`, `email`, `subject`, `message`, and source path
- admin:
  - local SDK `DataTable` inbox for recent submissions
  - search + source filtering + paging
  - side detail view with sender metadata, quick reply action, source page
    link, and full message body

## Validation and verification

Recommended checks from project root:

```bash
pnpm modules:prepare
pnpm modules:migrate -- --module=mod.contact
pnpm modules:sync
pnpm exec tsc --noEmit
```

## Notes

- The public form is intentionally open and does not require authentication.
- The module uses the existing host `/contact-us` page instead of taking over
  the public route with a module alias.
