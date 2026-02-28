import { toNumberOrFallback, toStringOrFallback } from '@skitsaas/sdk';
import { NexusSimpleMetricCard } from '../../components';
import type { TemplateProps } from '../template-types';

export default function SectionAdminPaymentsMetricsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const successfulCount = toNumberOrFallback(data?.successfulCount, 0);
  const pendingCount = toNumberOrFallback(data?.pendingCount, 0);
  const refundedCount = toNumberOrFallback(data?.refundedCount, 0);

  const successfulLabel = toStringOrFallback(data?.successfulLabel, 'Successful');
  const pendingLabel = toStringOrFallback(data?.pendingLabel, 'Pending');
  const refundedLabel = toStringOrFallback(data?.refundedLabel, 'Refunded');

  return (
    <div className={className} data-nexus-payments-metrics="enhanced">
      <NexusSimpleMetricCard label={successfulLabel} value={successfulCount} />
      <NexusSimpleMetricCard label={pendingLabel} value={pendingCount} />
      <NexusSimpleMetricCard label={refundedLabel} value={refundedCount} />
      {children}
    </div>
  );
}
