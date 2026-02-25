import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminAppConfigEmailTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Email Configuration');
  const description = toStringOrFallback(
    data?.description,
    'SMTP settings and delivery logs integration.'
  );
  const provider = toStringOrFallback(data?.provider, '');

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={provider ? `Provider: ${provider}` : null}
    >
      {children}
    </NexusPageShell>
  );
}
