import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminSuscriptionsUserEditTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Edit User Subscription');
  const description = toStringOrFallback(
    data?.description,
    'Assign or clear user-level subscription template.'
  );
  const userId = toStringOrFallback(data?.userId, '');

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={userId ? `User: ${userId}` : null}
    >
      {children}
    </NexusPageShell>
  );
}
