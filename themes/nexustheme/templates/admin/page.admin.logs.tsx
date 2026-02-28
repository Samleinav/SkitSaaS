import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminLogsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Logs');
  const description = toStringOrFallback(
    data?.description,
    'View system activity logs, monitor email deliveries, and track application events for debugging and auditing.'
  );
  const activeTab = toStringOrFallback(data?.tab, '');

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={activeTab ? `Tab: ${activeTab}` : null}
    >
      {children}
    </NexusPageShell>
  );
}
