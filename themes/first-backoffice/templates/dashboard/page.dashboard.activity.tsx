import {
  DashboardPageShell,
  type ThemeTemplateProps
} from '../../components/dashboard/page-shell';

export default function PageDashboardActivityTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <DashboardPageShell
      templateId="page.dashboard.activity"
      titleFallback="Activity"
      descriptionFallback="Recent account and team activity."
      data={data}
      className={className}
    >
      {children}
    </DashboardPageShell>
  );
}
