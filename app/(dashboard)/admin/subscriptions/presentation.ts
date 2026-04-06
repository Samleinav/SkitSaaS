import { cn } from '@/lib/utils';

export type AdminNormalizedSubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'unpaid'
  | 'canceled';

export function getSubscriptionStatusClassName(
  status: AdminNormalizedSubscriptionStatus
) {
  const baseClassName =
    'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium';
  if (status === 'active') {
    return cn(
      baseClassName,
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    );
  }

  if (status === 'trialing') {
    return cn(
      baseClassName,
      'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    );
  }

  if (status === 'unpaid') {
    return cn(
      baseClassName,
      'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    );
  }

  if (status === 'canceled') {
    return cn(baseClassName, 'border-border bg-muted text-muted-foreground');
  }

  return cn(baseClassName, 'border-border bg-muted text-muted-foreground');
}

export function getPaymentProviderClassName(provider: string | null) {
  const baseClassName =
    'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium';
  if (provider === 'stripe') {
    return cn(
      baseClassName,
      'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300'
    );
  }

  if (provider === 'paypal') {
    return cn(
      baseClassName,
      'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
    );
  }

  if (!provider) {
    return cn(baseClassName, 'border-border bg-muted text-muted-foreground');
  }

  return cn(baseClassName, 'border-primary/30 bg-primary/10 text-primary');
}

export function getAccountStatusClassName(
  className: string,
  extraClassName?: string
) {
  return cn(
    'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
    className,
    extraClassName
  );
}

export function formatSubscriptionPrice({
  priceCents,
  currency,
  locale
}: {
  priceCents: number | null | undefined;
  currency: string | null | undefined;
  locale: string;
}) {
  if (priceCents == null || !currency) {
    return null;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(priceCents / 100);
  } catch {
    return `${(priceCents / 100).toFixed(2)} ${currency}`;
  }
}
