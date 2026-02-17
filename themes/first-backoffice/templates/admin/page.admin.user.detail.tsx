import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminUserDetailTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.user.detail"
      titleFallback="User Details"
      descriptionFallback="Profile, account status, and organization relationships."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
