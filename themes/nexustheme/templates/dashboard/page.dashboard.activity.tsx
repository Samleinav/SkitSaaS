import type { TemplateProps } from '../template-types';
import { DashboardPageFrame } from '../../lib/dashboard-page-frame';

export default function PageDashboardActivityTemplate({
  data,
  className,
  children
}: TemplateProps) {
  return (
    <DashboardPageFrame
      data={data}
      className={className}
      eyebrow="Activity"
      descriptionFallback="Track recent account and workspace events in one streamlined timeline."
    >
      {children}
    </DashboardPageFrame>
  );
}
