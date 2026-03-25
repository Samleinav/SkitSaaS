import type { TemplateProps } from '../template-types';
import { DashboardPageFrame } from './page-frame';

export default function PageDashboardSecurityTemplate({
  data,
  className,
  children
}: TemplateProps) {
  return (
    <DashboardPageFrame
      data={data}
      className={className}
      eyebrow="Security"
      descriptionFallback="Manage password updates, account protection, and sensitive access settings."
    >
      {children}
    </DashboardPageFrame>
  );
}
