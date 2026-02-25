import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminAppConfigThemeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Theme Policy');
  const description = toStringOrFallback(
    data?.description,
    'Default admin and dashboard visual policy.'
  );
  const mode = toStringOrFallback(data?.mode, '');

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={mode ? `Mode: ${mode}` : null}
    >
      {children}
    </NexusPageShell>
  );
}
