import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminAppConfigPaymentMethodsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Payment Methods');
  const description = toStringOrFallback(
    data?.description,
    'Provider credentials and payment processing configuration.'
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
