import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminOrdersCreateTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Create Order');
  const description = toStringOrFallback(
    data?.description,
    'Create manual orders for teams and users.'
  );
  const targetType = toStringOrFallback(data?.initialTargetType, '');

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={targetType ? `Target: ${targetType}` : null}
    >
      {children}
    </NexusPageShell>
  );
}
