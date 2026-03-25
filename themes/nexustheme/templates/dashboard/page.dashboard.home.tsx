import type { TemplateProps } from '../template-types';
import { DashboardPageFrame } from '../../lib/dashboard-page-frame';

export default function PageDashboardHomeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  return (
    <DashboardPageFrame
      data={data}
      className={className}
      eyebrow="Dashboard"
      descriptionFallback="Overview of your workspace, team members, billing status, and recent activity."
    >
      {children}
    </DashboardPageFrame>
  );
}
