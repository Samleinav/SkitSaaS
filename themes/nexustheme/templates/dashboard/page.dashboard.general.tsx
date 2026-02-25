import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageDashboardGeneralTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'General');
  const description = toStringOrFallback(data?.description, 'Manage account profile details.');

  return (
    <NexusPageShell className={className} title={title} description={description}>
      {children}
    </NexusPageShell>
  );
}

