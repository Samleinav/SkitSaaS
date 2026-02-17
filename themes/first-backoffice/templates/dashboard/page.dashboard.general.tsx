import {
  DashboardPageShell,
  type ThemeTemplateProps
} from '../../components/dashboard/page-shell';

export default function PageDashboardGeneralTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <DashboardPageShell
      templateId="page.dashboard.general"
      titleFallback="General"
      descriptionFallback="Manage account profile details."
      data={data}
      className={className}
    >
      {children}
    </DashboardPageShell>
  );
}
