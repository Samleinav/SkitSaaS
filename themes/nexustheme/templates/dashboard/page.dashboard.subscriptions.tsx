import type { TemplateProps } from '../template-types';
import { DashboardPageFrame } from '../../lib/dashboard-page-frame';

export default function PageDashboardSubscriptionsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  return (
    <DashboardPageFrame
      data={data}
      className={className}
      eyebrow="Billing"
      descriptionFallback="Review plans, invoices, payment history, and current workspace subscription limits."
    >
      {children}
    </DashboardPageFrame>
  );
}
