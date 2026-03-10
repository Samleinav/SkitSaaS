---
name: theme-ctc-authoring
description: Author Component Template Controller (CTC) templates for a theme pack. Use this skill when creating or overriding ui.form, ui.table, ui.alert-dialog, ui.user-menu, or other CTC component IDs inside a theme.
---

# theme-ctc-authoring

## Scope

CTC template authoring inside `themes/<themeId>/templates/`. Resolution precedence, slot data contracts, `ui.user-menu`, and theme-owned template files.

## Required References

- `docs/themes/02-theme-authoring-guide.md` — minimal pack structure, `templates.json`, slot data examples
- `docs/themes/03-template-controller.md` — resolution precedence, `componentId` convention, contract version, lockable IDs

Key CTC files:

| File | Purpose |
|------|---------|
| `lib/templates/catalog.ts` | All registered `componentId` values |
| `lib/templates/contract.ts` | Contract version, compatibility helpers |
| `lib/templates/controller.ts` | Resolution runtime |
| `lib/templates/ui-form-payload.ts` | `ui.form` slot data types |
| `lib/templates/ui-table-payload.ts` | `ui.table` slot data types |
| `components/ui/template-build-form.tsx` | Host server wrapper for `ui.form` |

## Component IDs

| componentId | Used for |
|-------------|---------|
| `ui.form` | BuildForm instances |
| `ui.table` | DataTable instances |
| `ui.alert-dialog` | Confirm/destructive dialogs |
| `ui.async-submit-button` | Async submit buttons |
| `ui.user-menu` | User menu (notifications feed entry point) |

## Resolution Precedence (default `theme` priority)

1. `module_override`
2. `theme_area_override`
3. `theme_global_override`
4. `module_default`
5. `core_default`
6. `fallback`

## templates.json

```json
{
  "contractRange": "^1.0.0",
  "templates": [
    {
      "componentId": "ui.form",
      "templateId": "theme.<name>.ui.form",
      "area": "admin",
      "priority": "theme_area_override",
      "entry": "templates/admin/ui.form.tsx"
    }
  ]
}
```

## ui.user-menu with Notifications

Theme templates can surface the notifications feed in `ui.user-menu`:

```tsx
'use client'
import { useNotifications } from '@skitsaas/sdk';

export default function UserMenuTemplate({ children, area }) {
  const { items, unreadItems, markRead, dismiss } = useNotifications({ area });
  return (
    <div>
      {children}  {/* host-provided menu items */}
      <NotificationBadge count={unreadItems.length} />
    </div>
  );
}
```

`useNotifications` is the ONLY allowed import for notification data in theme templates — never import host notification utilities.

## Escalation Rule

If the template requires a new `componentId` not in `TEMPLATE_COMPONENT_IDS`, the slot data contract must be defined in `lib/templates/` first. Escalate to `core-ui-systems`.

## Verification

```bash
pnpm themes:prepare      # validates templatePack entries
npx tsx --test tests/themes/  # if theme tests exist
pnpm exec tsc --noEmit
```
