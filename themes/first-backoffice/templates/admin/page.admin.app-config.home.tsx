import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminAppConfigHomeTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.app-config.home"
      titleFallback="App Configuration"
      descriptionFallback="Environment-backed configuration and runtime defaults."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
