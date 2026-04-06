---
name: skss-ui-builders
description: Use for BuildForm, BuildTable, validations, `ui.form`, `ui.table`, and admin/dashboard CRUD UI work in SkitSaaS.
---

# skss-ui-builders

## Read Order

1. `../../docs/skitsaas/forms-and-validation.md`
2. `../../docs/skitsaas/admin-crud-playbook.md`
3. `../../docs/skitsaas/datatables-and-remote-actions.md`
4. `../../docs/skitsaas/themes-and-ctc.md`
5. `../../docs/skitsaas/theme-development/index.md` when the task is theme-owned rather than core-owned
6. `../../docs/skitsaas/theme-development/template-precedence-and-locking.md` when the task depends on CTC winner order or `lockTemplate`
7. `../../docs/skitsaas/theme-development/build-time-selection-and-adr.md` when the task depends on theme selection or generated theme artifacts
8. `../../docs/skitsaas/theme-development/theme-pack-worked-examples.md` when the task needs a concrete theme shape
9. `../../docs/skitsaas/theme-development/backoffice-override-worked-example.md` when the task is about admin/dashboard override behavior
10. `../../docs/skitsaas/theme-development/override-catalog.md` when the task needs the concrete `componentId` or template filename surface

## Verify In Code Only If Needed

- `app/sdk/src/forms.ts`
- `app/sdk/src/form-validation.ts`
- `app/sdk/src/datatables/*`
- `lib/forms/*`
- `components/ui/build-form.tsx`
- `components/ui/template-build-form.tsx`
- `components/ui/data-table.tsx`
- `lib/templates/*`

## Rules

- prefer BuildForm before custom form plumbing
- prefer BuildTable before custom grid contracts
- use controller-wrapped server actions for mutations
- remember that host bridges can upgrade SDK renderers automatically
- check CTC before assuming one fixed admin/dashboard UI renderer
- when the task is a full CRUD flow, follow the playbook before improvising the
  file layout
- for admin/dashboard work, bias the UI toward compact, technical, operational
  surfaces rather than marketing/frontend presentation
- prefer dense shadcn-style composition: tighter spacing, smaller controls,
  clearer hierarchy, and more useful information above the fold
- avoid default "Tailwind demo" inflation: oversized cards, generous empty
  whitespace, large hero spacing, and decorative padding that reduces scanning
  efficiency
- for operator-facing admin/dashboard views, default to an operational UX:
  `DataTable` for scan/filter/triage plus a detail panel or dedicated detail
  view for the selected record
- do not stop at "data is visible"; optimize for the actual admin task flow:
  search, open, inspect, act, return to queue

## Watch For

- bypassing the BuildForm registry
- teaching `source-package` modules to use host-only UI imports
- forgetting preflight has its own security path
- defaulting to legacy `ColumnDef[]` mode when SDK BuildTable is enough
- shipping flat card walls for operational datasets when a queue/table pattern
  is the better fit
- reusing frontend/marketing spacing or visual rhythm in admin operations screens
