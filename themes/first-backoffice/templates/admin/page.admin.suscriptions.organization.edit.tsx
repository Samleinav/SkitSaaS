import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminSuscriptionsOrganizationEditTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.suscriptions.organization.edit"
      titleFallback="Edit Organization Subscription"
      descriptionFallback="Manage organization subscription provider and status."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
