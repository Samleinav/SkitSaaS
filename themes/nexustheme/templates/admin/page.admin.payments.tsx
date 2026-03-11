import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminPaymentsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Payments');
  const description = toStringOrFallback(
    data?.description,
    'Review payment transactions, manage refunds, and reconcile financial records across all accounts.'
  );

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      variant="compact"
    >
      <div
        className={mergeClassNames(
          'space-y-4',
          '[&>div]:space-y-4',
          '[&>div>*]:border-border/60',
          '[&>div>*]:shadow-[0_18px_36px_-32px_rgba(0,0,0,0.82)]',
          '[&>div>*:last-child]:rounded-[1.55rem]',
          '[&>div>*:last-child]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.16)_100%)]',
          '[&>div>*:last-child_[data-slot=card-header]]:gap-1.5',
          '[&>div>*:last-child_[data-slot=card-header]]:border-b',
          '[&>div>*:last-child_[data-slot=card-header]]:border-border/55',
          '[&>div>*:last-child_[data-slot=card-header]]:px-5',
          '[&>div>*:last-child_[data-slot=card-header]]:pt-5',
          '[&>div>*:last-child_[data-slot=card-header]]:pb-4',
          '[&>div>*:last-child_[data-slot=card-title]]:text-lg',
          '[&>div>*:last-child_[data-slot=card-title]]:tracking-[-0.02em]',
          '[&>div>*:last-child_[data-slot=card-description]]:text-[13px]',
          '[&>div>*:last-child_[data-slot=card-description]]:leading-5',
          '[&>div>*:last-child_[data-slot=card-content]]:px-5',
          '[&>div>*:last-child_[data-slot=card-content]]:pt-5',
          '[&>div>*:last-child_[data-slot=card-content]]:pb-5'
        )}
      >
        {children}
      </div>
    </NexusPageShell>
  );
}
