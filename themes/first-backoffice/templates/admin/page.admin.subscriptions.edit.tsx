import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminSubscriptionsEditTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.subscriptions.edit"
      titleFallback="Edit Subscription Template"
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
