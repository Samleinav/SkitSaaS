import {
  DashboardPageShell,
  type ThemeTemplateProps
} from '../../components/dashboard/page-shell';

export default function PageDashboardActivityLoadingTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <DashboardPageShell
      templateId="page.dashboard.activity.loading"
      titleFallback="Activity"
      descriptionFallback="Loading recent activity."
      data={data}
      className={className}
    >
      {children}
    </DashboardPageShell>
  );
}
