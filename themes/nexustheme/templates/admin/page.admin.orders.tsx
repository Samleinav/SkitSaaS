import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminOrdersTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Orders');
  const description = toStringOrFallback(
    data?.description,
    'Operational payment orders and statuses.'
  );

  return (
    <NexusPageShell className={className} title={title} description={description}>
      {children}
    </NexusPageShell>
  );
}
