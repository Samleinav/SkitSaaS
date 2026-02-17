import {
  DashboardPageShell,
  type ThemeTemplateProps
} from '../../components/dashboard/page-shell';

export default function PageDashboardSubscriptionsTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <DashboardPageShell
      templateId="page.dashboard.subscriptions"
      titleFallback="Subscriptions"
      descriptionFallback="Manage plans, organizations, and billing events."
      data={data}
      className={className}
    >
      {children}
    </DashboardPageShell>
  );
}
