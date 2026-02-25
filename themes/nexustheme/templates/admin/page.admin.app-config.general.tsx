import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminAppConfigGeneralTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'General Configuration');
  const description = toStringOrFallback(
    data?.description,
    'Organization and tenant behavior controls.'
  );

  return (
    <NexusPageShell className={className} title={title} description={description}>
      {children}
    </NexusPageShell>
  );
}
