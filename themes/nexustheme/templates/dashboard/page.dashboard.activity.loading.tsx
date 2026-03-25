import type { TemplateProps } from '../template-types';
import { DashboardPageFrame } from '../../lib/dashboard-page-frame';

export default function PageDashboardActivityLoadingTemplate({
  data,
  className,
  children
}: TemplateProps) {
  return (
    <DashboardPageFrame
      data={data}
      className={className}
      eyebrow="Activity"
      descriptionFallback="Loading your latest account and workspace events."
    >
      {children}
    </DashboardPageFrame>
  );
}
