import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminSubscriptionsCreateTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Create Subscription Template');

  return (
    <NexusPageShell className={className} title={title}>
      {children}
    </NexusPageShell>
  );
}

