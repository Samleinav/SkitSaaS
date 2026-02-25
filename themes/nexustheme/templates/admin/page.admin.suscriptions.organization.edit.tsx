import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminSuscriptionsOrganizationEditTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Edit Organization Subscription');
  const description = toStringOrFallback(
    data?.description,
    'Manage organization subscription provider and status.'
  );
  const teamId = toStringOrFallback(data?.teamId, '');

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={teamId ? `Team: ${teamId}` : null}
    >
      {children}
    </NexusPageShell>
  );
}
