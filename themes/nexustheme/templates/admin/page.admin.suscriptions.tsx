import { toStringOrFallback } from '@skitsaas/sdk';
import { NexusPageShell } from '../../lib/page-shell';
import type { TemplateProps } from '../template-types';

export default function PageAdminSuscriptionsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Subscriptions');
  const description = toStringOrFallback(
    data?.description,
    'Manage subscription plans, renewals, and billing cycles for users and organizations. Monitor active subscriptions and handle plan changes.'
  );
  const scope = toStringOrFallback(data?.scope, 'organization');

  return (
    <NexusPageShell
      className={className}
      title={title}
      description={description}
      badge={`Scope: ${scope}`}
    >
      {children}
    </NexusPageShell>
  );
}
