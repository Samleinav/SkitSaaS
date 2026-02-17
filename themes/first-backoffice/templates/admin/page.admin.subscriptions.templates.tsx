import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminSubscriptionsTemplatesTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.subscriptions.templates"
      titleFallback="Subscription Templates"
      descriptionFallback="Manage subscription templates and public feature flags."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
