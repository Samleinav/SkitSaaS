import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminSubscriptionsCreateTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.subscriptions.create"
      titleFallback="Create Subscription Template"
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
