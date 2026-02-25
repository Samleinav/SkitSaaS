import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminOrdersEditTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Edit Order');
  const description = toStringOrFallback(
    data?.description,
    'Adjust order status, provider metadata, and linkage.'
  );
  const orderId = toStringOrFallback(data?.orderId, '');

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={orderId ? `Order: ${orderId}` : null}
    >
      {children}
    </NexusPageShell>
  );
}
