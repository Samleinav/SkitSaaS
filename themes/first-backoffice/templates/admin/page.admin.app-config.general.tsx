import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminAppConfigGeneralTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.app-config.general"
      titleFallback="General Configuration"
      descriptionFallback="Organization and tenant behavior controls."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
