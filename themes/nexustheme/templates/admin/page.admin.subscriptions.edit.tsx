import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminSubscriptionsEditTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Edit Subscription Template');

  return (
    <NexusPageShell className={className} title={title}>
      {children}
    </NexusPageShell>
  );
}

