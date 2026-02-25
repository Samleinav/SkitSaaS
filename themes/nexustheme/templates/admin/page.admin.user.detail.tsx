import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminUserDetailTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'User Details');
  const description = toStringOrFallback(
    data?.description,
    'Profile, account status, and organization relationships.'
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
