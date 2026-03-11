'use client';

import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

type PaymentTableCellData = {
  slot?: string;
  source?: string;
};

export default function SectionAdminTablePaymentsCellTemplate({
  data,
  className,
  children
}: TemplateProps<PaymentTableCellData>) {
  const slot = toStringOrFallback(data?.slot, '');

  if (slot.startsWith('header.')) {
    return (
      <div
        className={mergeClassNames(
          '[&_[data-slot=button]]:-ml-1 [&_[data-slot=button]]:h-8 [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:px-2.5 [&_[data-slot=button]]:text-[12px] [&_[data-slot=button]]:font-semibold [&_[data-slot=button]]:tracking-[-0.01em] [&_[data-slot=button]]:text-foreground [&_[data-slot=button]]:hover:bg-foreground/5',
          className
        )}
      >
        {children}
      </div>
    );
  }

  if (slot === 'cell.paid-at') {
    return (
      <span className={mergeClassNames('text-[13px] text-muted-foreground', className)}>
        {children}
      </span>
    );
  }

  if (slot === 'cell.payer') {
    return (
      <div
        className={mergeClassNames(
          'min-w-[190px] [&_p]:text-sm [&_p]:font-semibold [&_p]:tracking-[-0.015em] [&_p]:text-foreground',
          className
        )}
      >
        {children}
      </div>
    );
  }

  if (slot === 'cell.reason') {
    return (
      <div className={mergeClassNames('min-w-[220px] max-w-[320px]', className)}>
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {children}
        </span>
      </div>
    );
  }

  if (slot === 'cell.source') {
    const source = toStringOrFallback(data?.source, 'system');
    const toneClassName =
      source === 'checkout'
        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
        : source === 'webhook'
          ? 'border-sky-500/25 bg-sky-500/10 text-sky-200'
          : source === 'dashboard'
            ? 'border-violet-500/25 bg-violet-500/10 text-violet-200'
            : 'border-border/55 bg-muted/20 text-muted-foreground';

    return (
      <span
        className={mergeClassNames(
          'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
          toneClassName,
          className
        )}
      >
        {children}
      </span>
    );
  }

  if (slot === 'cell.payment-type') {
    return (
      <span
        className={mergeClassNames(
          'inline-flex items-center rounded-full border border-border/55 bg-background/72 px-2.5 py-1 text-[11px] font-medium leading-none text-foreground/82',
          className
        )}
      >
        {children}
      </span>
    );
  }

  if (slot === 'cell.amount') {
    return (
      <span
        className={mergeClassNames(
          'text-sm font-semibold tabular-nums tracking-[-0.015em] text-foreground',
          className
        )}
      >
        {children}
      </span>
    );
  }

  if (slot === 'cell.payment-reference') {
    return (
      <span
        className={mergeClassNames(
          'inline-flex max-w-[240px] truncate rounded-md border border-border/55 bg-muted/18 px-2.5 py-1 font-mono text-[11px] text-muted-foreground',
          className
        )}
      >
        {children}
      </span>
    );
  }

  if (slot === 'cell.purchase-order-reference') {
    return (
      <div className={mergeClassNames('min-w-[210px] space-y-1', className)}>
        {children}
      </div>
    );
  }

  if (slot === 'cell.actions.preview') {
    return (
      <div
        className={mergeClassNames(
          'flex justify-end [&_[data-slot=button]]:h-9 [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-border/60 [&_[data-slot=button]]:bg-background/72 [&_[data-slot=button]]:px-3.5 [&_[data-slot=button]]:text-[13px] [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none',
          className
        )}
      >
        {children}
      </div>
    );
  }

  return <span className={className}>{children}</span>;
}
