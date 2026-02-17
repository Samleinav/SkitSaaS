import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminSuscriptionsUserEditTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.suscriptions.user.edit"
      titleFallback="Edit User Subscription"
      descriptionFallback="Assign or clear user-level subscription template."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
