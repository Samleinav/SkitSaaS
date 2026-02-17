import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminLogsTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.logs"
      titleFallback="Logs"
      descriptionFallback="System and email delivery logs."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
