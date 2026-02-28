import { toNumberOrFallback } from '@skitsaas/sdk';
import { NexusSimpleMetricCard } from '../../components';
import type { TemplateProps } from '../template-types';

type UserMetric = {
  label: string;
  value: number;
};

export default function SectionAdminUsersMetricsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  // Extract metrics from data or children
  const activeCount = toNumberOrFallback(data?.activeCount, 0);
  const suspendedCount = toNumberOrFallback(data?.suspendedCount, 0);
  const bannedCount = toNumberOrFallback(data?.bannedCount, 0);
  const activeLabel = data?.activeLabel as string | undefined ?? 'Active Users';
  const suspendedLabel = data?.suspendedLabel as string | undefined ?? 'Suspended';
  const bannedLabel = data?.bannedLabel as string | undefined ?? 'Banned';

  // If no data provided, render children as-is (fallback compatibility)
  if (!data?.activeCount && !data?.suspendedCount && !data?.bannedCount) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className} data-nexus-users-metrics="enhanced">
      <NexusSimpleMetricCard label={activeLabel} value={activeCount} />
      <NexusSimpleMetricCard label={suspendedLabel} value={suspendedCount} />
      <NexusSimpleMetricCard label={bannedLabel} value={bannedCount} />
    </div>
  );
}
