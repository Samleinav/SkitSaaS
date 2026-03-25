import type { TemplateProps } from '../template-types';
import { DashboardPageFrame } from '../../lib/dashboard-page-frame';

export default function PageDashboardGeneralTemplate({
  data,
  className,
  children
}: TemplateProps) {
  return (
    <DashboardPageFrame
      data={data}
      className={className}
      eyebrow="Account"
      descriptionFallback="Update your profile details and keep your personal workspace information current."
    >
      {children}
    </DashboardPageFrame>
  );
}
