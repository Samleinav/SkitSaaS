'use client';

import {
  mergeClassNames,
  toNumberOrFallback,
  toStringOrFallback
} from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

type SubscriptionTemplateCellData = {
  slot?: string;
  scope?: string;
  categoryKey?: string;
  hierarchyRank?: number | string;
  billingInterval?: string;
  currency?: string;
  priceCents?: number | string;
  publicFeaturesCount?: number | string;
};

export default function SectionAdminTableSubscriptionsTemplatesCellTemplate({
  data,
  className,
  children
}: TemplateProps<SubscriptionTemplateCellData>) {
  const slot = toStringOrFallback(data?.slot, '');
  const scope = toStringOrFallback(data?.scope, '');
  const categoryKey = toStringOrFallback(data?.categoryKey, '');
  const rank = toNumberOrFallback(data?.hierarchyRank, 0);
  const billingInterval = toStringOrFallback(data?.billingInterval, '');
  const currency = toStringOrFallback(data?.currency, '');
  const priceCents = toNumberOrFallback(data?.priceCents, 0);
  const publicFeaturesCount = toNumberOrFallback(data?.publicFeaturesCount, 0);

  if (slot.startsWith('header.')) {
    return (
      <span
        className={mergeClassNames(
          'text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80',
          className
        )}
      >
        {children}
      </span>
    );
  }

  if (slot === 'cell.name') {
    return (
      <span className={mergeClassNames('font-semibold tracking-[-0.015em] text-foreground', className)}>
        {children}
      </span>
    );
  }

  if (slot === 'cell.scope') {
    const toneClassName =
      scope === 'organization'
        ? 'border-sky-500/20 bg-sky-500/10 text-sky-200'
        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';

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

  if (slot === 'cell.category') {
    return (
      <code
        className={mergeClassNames(
          'inline-flex max-w-[18rem] items-center rounded-md border border-border/55 bg-muted/20 px-2.5 py-1 font-mono text-[11px] text-muted-foreground',
          className
        )}
      >
        {children ?? categoryKey}
      </code>
    );
  }

  if (slot === 'cell.rank') {
    return (
      <span
        className={mergeClassNames(
          'inline-flex min-w-8 items-center justify-center rounded-md border border-border/55 bg-muted/18 px-2 py-1 text-[12px] font-medium tabular-nums text-foreground/88',
          className
        )}
      >
        {children ?? rank}
      </span>
    );
  }

  if (slot === 'cell.interval') {
    return (
      <span
        className={mergeClassNames(
          'inline-flex items-center rounded-full border border-border/55 bg-background/68 px-2.5 py-1 text-[11px] font-medium leading-none text-foreground/82',
          className
        )}
      >
        {children ?? billingInterval}
      </span>
    );
  }

  if (slot === 'cell.price') {
    return (
      <div className={mergeClassNames('flex items-baseline gap-1.5', className)}>
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {currency}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {(priceCents / 100).toFixed(2)}
        </span>
      </div>
    );
  }

  if (slot === 'cell.public-features') {
    const featuresToneClassName =
      publicFeaturesCount > 0
        ? 'border-primary/25 bg-primary/12 text-primary'
        : 'border-border/55 bg-muted/18 text-muted-foreground';

    return (
      <span
        className={mergeClassNames(
          'inline-flex min-w-8 items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none tabular-nums',
          featuresToneClassName,
          className
        )}
      >
        {children ?? publicFeaturesCount}
      </span>
    );
  }

  if (slot === 'cell.actions.edit') {
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
