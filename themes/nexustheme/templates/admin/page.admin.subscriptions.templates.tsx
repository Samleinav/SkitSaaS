import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminSubscriptionsTemplatesTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Subscription Templates');
  const description = toStringOrFallback(
    data?.description,
    'Manage subscription templates and public feature flags.'
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
          '[&>div]:rounded-[1.55rem]',
          '[&>div]:border-border/60',
          '[&>div]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.16)_100%)]',
          '[&>div]:shadow-[0_18px_36px_-32px_rgba(0,0,0,0.82)]',
          '[&>div_[data-slot=card-header]]:flex-row',
          '[&>div_[data-slot=card-header]]:items-center',
          '[&>div_[data-slot=card-header]]:justify-between',
          '[&>div_[data-slot=card-header]]:gap-4',
          '[&>div_[data-slot=card-header]]:border-b',
          '[&>div_[data-slot=card-header]]:border-border/55',
          '[&>div_[data-slot=card-header]]:px-5',
          '[&>div_[data-slot=card-header]]:py-5',
          '[&>div_[data-slot=card-title]]:text-lg',
          '[&>div_[data-slot=card-title]]:tracking-[-0.02em]',
          '[&>div_[data-slot=card-description]]:text-[13px]',
          '[&>div_[data-slot=card-description]]:leading-5',
          '[&>div_[data-slot=card-content]]:px-5',
          '[&>div_[data-slot=card-content]]:pt-5',
          '[&>div_[data-slot=card-content]]:pb-5',
          '[&>div_[data-slot=button]]:h-10',
          '[&>div_[data-slot=button]]:rounded-xl',
          '[&>div_[data-slot=button]]:border-border/65',
          '[&>div_[data-slot=button]]:bg-background/72',
          '[&>div_[data-slot=button]]:px-4',
          '[&>div_[data-slot=button]]:shadow-none'
        )}
      >
        {children}
      </div>
    </NexusPageShell>
  );
}
