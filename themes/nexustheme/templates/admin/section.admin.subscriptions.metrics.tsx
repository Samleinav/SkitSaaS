import { toNumberOrFallback, toStringOrFallback } from '@skitsaas/sdk';
import { NexusSimpleMetricCard } from '../../components';
import type { TemplateProps } from '../template-types';

export default function SectionAdminSubscriptionsMetricsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const activeCount = toNumberOrFallback(data?.activeCount, 0);
  const trialCount = toNumberOrFallback(data?.trialCount, 0);
  const canceledCount = toNumberOrFallback(data?.canceledCount, 0);

  const activeLabel = toStringOrFallback(data?.activeLabel, 'Active');
  const trialLabel = toStringOrFallback(data?.trialLabel, 'Trial');
  const canceledLabel = toStringOrFallback(data?.canceledLabel, 'Canceled');

  return (
    <div className={className} data-nexus-subscriptions-metrics="enhanced">
      <NexusSimpleMetricCard label={activeLabel} value={activeCount} />
      <NexusSimpleMetricCard label={trialLabel} value={trialCount} />
      <NexusSimpleMetricCard label={canceledLabel} value={canceledCount} />
      {children}
    </div>
  );
}
