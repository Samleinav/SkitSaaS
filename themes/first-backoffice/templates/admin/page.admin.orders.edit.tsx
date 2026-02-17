import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminOrdersEditTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.orders.edit"
      titleFallback="Edit Order"
      descriptionFallback="Adjust order status, provider metadata, and linkage."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
