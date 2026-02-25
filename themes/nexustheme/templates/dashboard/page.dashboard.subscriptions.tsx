import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageDashboardSubscriptionsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Subscriptions');
  const description = toStringOrFallback(
    data?.description,
    'Manage plans, organizations, and billing events.'
  );

  return (
    <NexusPageShell className={className} title={title} description={description}>
      {children}
    </NexusPageShell>
  );
}

