import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminSuscriptionsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Subscriptions');
  const description = toStringOrFallback(
    data?.description,
    'Manage subscription plans, renewals, and billing cycles for users and organizations.'
  );
  const scope = toStringOrFallback(data?.scope, 'organization');
  const badge = scope === 'user' ? 'User scope' : 'Organization scope';

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={badge}
      variant="compact"
    >
      <div
        className={mergeClassNames(
          'space-y-4',
          '[&>div]:space-y-4',
          '[&>div>*]:border-border/60',
          '[&>div>*]:shadow-[0_18px_36px_-32px_rgba(0,0,0,0.8)]',
          '[&>div>*:first-child]:rounded-[1.5rem]',
          '[&>div>*:first-child]:bg-[linear-gradient(180deg,hsl(var(--muted)/0.22)_0%,hsl(var(--background))_100%)]',
          '[&>div>*:first-child>div:nth-child(1)]:hidden',
          '[&>div>*:first-child>div:nth-child(2)]:hidden',
          '[&>div>*:first-child_[data-slot=card-header]]:gap-4',
          '[&>div>*:first-child_[data-slot=card-header]]:px-5',
          '[&>div>*:first-child_[data-slot=card-header]]:py-5',
          '[&>div>*:first-child_[data-slot=card-header]]:lg:items-center',
          '[&>div>*:first-child_[data-slot=card-header]>div:first-child]:space-y-0.5',
          '[&>div>*:first-child_[data-slot=card-header]>div:last-child]:gap-2.5',
          '[&>div>*:first-child_[data-slot=card-title]]:text-lg',
          '[&>div>*:first-child_[data-slot=card-title]]:tracking-[-0.02em]',
          '[&>div>*:first-child_[data-slot=card-description]]:hidden',
          '[&>div>*:first-child_[data-slot=button]]:h-10',
          '[&>div>*:first-child_[data-slot=button]]:rounded-xl',
          '[&>div>*:first-child_[data-slot=button]]:px-4',
          '[&>div>*:first-child_[data-slot=button]]:shadow-none',
          '[&>div>*:first-child_a]:whitespace-nowrap',
          '[&>div>*:first-child_[data-slot=card-header]>div:last-child>div]:border-border/70',
          '[&>div>*:first-child_[data-slot=card-header]>div:last-child>div]:bg-background/72',
          '[&>div>*:last-child]:rounded-[1.55rem]',
          '[&>div>*:last-child]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.16)_100%)]',
          '[&>div>*:last-child_[data-slot=card-header]]:gap-1.5',
          '[&>div>*:last-child_[data-slot=card-header]]:px-5',
          '[&>div>*:last-child_[data-slot=card-header]]:pt-5',
          '[&>div>*:last-child_[data-slot=card-header]]:pb-0',
          '[&>div>*:last-child_[data-slot=card-title]]:text-lg',
          '[&>div>*:last-child_[data-slot=card-title]]:tracking-[-0.02em]',
          '[&>div>*:last-child_[data-slot=card-description]]:text-[13px]',
          '[&>div>*:last-child_[data-slot=card-content]]:px-5',
          '[&>div>*:last-child_[data-slot=card-content]]:pt-4',
          '[&>div>*:last-child_[data-slot=card-content]]:pb-5'
        )}
      >
        {children}
      </div>
    </NexusPageShell>
  );
}
