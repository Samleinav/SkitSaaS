# Nexus Theme — Module Template Overrides

This directory contains per-module template overrides for the Nexus theme.

## Structure

```
templates/mods/
└── <moduleId>/
    ├── page.<moduleId>.<view>.tsx
    └── section.<moduleId>.<component>.tsx
```

## Naming convention

Files must follow the CTC filename-based `componentId` rule:
- One file = one `componentId`
- `componentId` = filename without `.tsx`
- Example: `templates/mods/billing/page.billing.invoices.tsx` → `componentId: "page.billing.invoices"`

To avoid collisions with core admin/dashboard templates, always prefix with the module ID:
- ✅ `page.billing.invoices.tsx`
- ❌ `page.invoices.tsx` (conflicts with potential core template)

## Example

```tsx
// templates/mods/billing/page.billing.invoices.tsx
import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../../template-types';

export default function PageBillingInvoicesTemplate({
  data,
  className,
  children,
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Invoices');
  return (
    <NexusPageShell className={className} title={title}>
      {children}
    </NexusPageShell>
  );
}
```

## Guidelines

- Always import from `@skitsaas/sdk` — never from `@/lib/*` host internals
- Use `NexusPageShell` for full-page layouts
- Use `NexusSimpleMetricCard` / `NexusMetricCard` from `../../components` for metric displays
- Keep module templates self-contained; shared utilities live in `../../lib/` and `../../components/`
