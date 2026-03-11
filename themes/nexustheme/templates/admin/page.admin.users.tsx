import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminUsersTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Users');
  const description = 'Manage user accounts, subscriptions, and access permissions.';

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      variant="compact"
    >
      {children}
    </NexusPageShell>
  );
}
