import { toNumberOrFallback, toStringOrFallback } from '@skitsaas/sdk';
import { NexusSimpleMetricCard } from '../../components';
import type { TemplateProps } from '../template-types';

export default function SectionAdminOrdersMetricsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const pendingCount = toNumberOrFallback(data?.pendingCount, 0);
  const completedCount = toNumberOrFallback(data?.completedCount, 0);
  const failedCount = toNumberOrFallback(data?.failedCount, 0);

  const pendingLabel = toStringOrFallback(data?.pendingLabel, 'Pending');
  const completedLabel = toStringOrFallback(data?.completedLabel, 'Completed');
  const failedLabel = toStringOrFallback(data?.failedLabel, 'Failed');

  return (
    <div className={className} data-nexus-orders-metrics="enhanced">
      <NexusSimpleMetricCard label={pendingLabel} value={pendingCount} />
      <NexusSimpleMetricCard label={completedLabel} value={completedCount} />
      <NexusSimpleMetricCard label={failedLabel} value={failedCount} />
      {children}
    </div>
  );
}
