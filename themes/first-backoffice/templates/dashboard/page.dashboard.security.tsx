import {
  DashboardPageShell,
  type ThemeTemplateProps
} from '../../components/dashboard/page-shell';

export default function PageDashboardSecurityTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <DashboardPageShell
      templateId="page.dashboard.security"
      titleFallback="Security"
      descriptionFallback="Manage password and account access."
      data={data}
      className={className}
    >
      {children}
    </DashboardPageShell>
  );
}
