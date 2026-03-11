import { mergeClassNames, toNumberOrFallback, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminMetricsGridTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const columns = toNumberOrFallback(data?.columns, 4);
  const variant = toStringOrFallback(data?.variant, 'default');
  const columnClassName =
    columns >= 4
      ? 'sm:grid-cols-2 xl:grid-cols-4'
      : columns === 3
        ? 'sm:grid-cols-2 xl:grid-cols-3'
        : columns === 2
          ? 'sm:grid-cols-2'
          : 'sm:grid-cols-1';
  const isUsersVariant = variant === 'users';
  const isSubscriptionsVariant =
    variant === 'suscriptions.organization' || variant === 'suscriptions.user';
  const childGridClassName = columnClassName
    .split(' ')
    .map((token) => `[&>div]:${token}`)
    .join(' ');

  return (
    <section
      className={mergeClassNames(
        '@container/metrics',
        '[&>div]:grid',
        childGridClassName,
        isUsersVariant ? 'max-w-4xl 2xl:max-w-[68rem]' : null,
        // Apply gradient styling to any descendant card (works even when cards
        // are wrapped in the page's own grid div passed as children)
        '[&_[data-slot=card]]:from-primary/5 [&_[data-slot=card]]:to-card',
        'dark:[&_[data-slot=card]]:bg-card [&_[data-slot=card]]:bg-gradient-to-t',
        '[&_[data-slot=card]]:shadow-sm',
        isUsersVariant
          ? mergeClassNames(
              '[&>div]:gap-3',
              '[&>div]:xl:max-w-[60rem]',
              '[&_[data-slot=card]]:gap-2.5',
              '[&_[data-slot=card]]:rounded-xl',
              '[&_[data-slot=card]]:border-border/55',
              '[&_[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.22)_100%)]',
              '[&_[data-slot=card]]:py-4',
              '[&_[data-slot=card]]:shadow-[0_14px_32px_-26px_rgba(0,0,0,0.82)]',
              '[&_[data-slot=card-header]]:grid-rows-[auto]',
              '[&_[data-slot=card-header]]:gap-0',
              '[&_[data-slot=card-header]]:px-5',
              '[&_[data-slot=card-header]]:pb-0',
              '[&_[data-slot=card-header]]:pt-4',
              '[&_[data-slot=card-header]_p]:text-[13px]',
              '[&_[data-slot=card-header]_p]:font-medium',
              '[&_[data-slot=card-header]_p]:tracking-[-0.01em]',
              '[&_[data-slot=card-header]_p]:text-muted-foreground',
              '[&_[data-slot=card-content]]:px-5',
              '[&_[data-slot=card-content]]:pt-1.5',
              '[&_[data-slot=card-content]_p]:text-[2rem]',
              '[&_[data-slot=card-content]_p]:font-semibold',
              '[&_[data-slot=card-content]_p]:leading-none',
              '[&_[data-slot=card-content]_p]:tracking-[-0.03em]',
              '[&_[data-slot=card-content]_p]:tabular-nums'
            )
          : null,
        isSubscriptionsVariant
          ? mergeClassNames(
              '[&>div]:gap-3.5',
              '[&_[data-slot=card]]:gap-0',
              '[&_[data-slot=card]]:rounded-[1.35rem]',
              '[&_[data-slot=card]]:border-border/60',
              '[&_[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.2)_100%)]',
              '[&_[data-slot=card]]:py-0',
              '[&_[data-slot=card]]:shadow-[0_18px_38px_-32px_rgba(0,0,0,0.8)]',
              '[&_[data-slot=card-header]]:px-5',
              '[&_[data-slot=card-header]]:pt-4',
              '[&_[data-slot=card-header]]:pb-0',
              '[&_[data-slot=card-header]>div]:flex',
              '[&_[data-slot=card-header]>div]:items-start',
              '[&_[data-slot=card-header]>div]:justify-between',
              '[&_[data-slot=card-header]>div]:gap-3',
              '[&_[data-slot=card-header]>div>span]:h-8',
              '[&_[data-slot=card-header]>div>span]:w-8',
              '[&_[data-slot=card-header]>div>span]:rounded-lg',
              '[&_[data-slot=card-header]>div>span]:shadow-none',
              '[&_[data-slot=card-description]]:text-[13px]',
              '[&_[data-slot=card-description]]:font-medium',
              '[&_[data-slot=card-description]]:tracking-[-0.01em]',
              '[&_[data-slot=card-description]]:text-foreground/86',
              '[&_[data-slot=card-content]]:space-y-2',
              '[&_[data-slot=card-content]]:px-5',
              '[&_[data-slot=card-content]]:pt-4',
              '[&_[data-slot=card-content]]:pb-4',
              '[&_[data-slot=card-content]>p:first-child]:text-[2rem]',
              '[&_[data-slot=card-content]>p:first-child]:font-semibold',
              '[&_[data-slot=card-content]>p:first-child]:leading-none',
              '[&_[data-slot=card-content]>p:first-child]:tracking-[-0.04em]',
              '[&_[data-slot=card-content]>p:first-child]:tabular-nums',
              '[&_[data-slot=card-content]>p:last-child]:text-[12px]',
              '[&_[data-slot=card-content]>p:last-child]:leading-5',
              '[&_[data-slot=card-content]>p:last-child]:text-muted-foreground'
            )
          : null,
        className
      )}
      data-metrics-columns={columns}
      data-metrics-variant={variant}
      data-nexus-metrics-grid="modern"
    >
      {children}
    </section>
  );
}
