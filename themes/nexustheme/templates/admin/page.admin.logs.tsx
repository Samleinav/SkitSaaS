import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminLogsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Logs');
  const description = toStringOrFallback(data?.description, 'System and email delivery logs.');
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
