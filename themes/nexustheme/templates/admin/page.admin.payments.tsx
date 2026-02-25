import { toStringOrFallback } from '@skitsaas/sdk';
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
    'Payments ledger and reconciliation.'
  );

  return (
    <NexusPageShell className={className} title={title} description={description}>
      {children}
    </NexusPageShell>
  );
}
