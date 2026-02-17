import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminAppConfigThemeTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.app-config.theme"
      titleFallback="Theme Policy"
      descriptionFallback="Default admin and dashboard visual policy."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
