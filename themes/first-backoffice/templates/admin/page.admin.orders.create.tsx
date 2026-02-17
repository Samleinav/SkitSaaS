import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminOrdersCreateTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.orders.create"
      titleFallback="Create Order"
      descriptionFallback="Create manual orders for teams and users."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
