import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminAppConfigEmailTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.app-config.email"
      titleFallback="Email Configuration"
      descriptionFallback="SMTP settings and delivery logs integration."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
