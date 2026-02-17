import { AdminPageShell, type ThemeTemplateProps } from '../../components/admin/page-shell';

export default function PageAdminAppConfigPaymentMethodsTemplate({
  data,
  className,
  children
}: ThemeTemplateProps) {
  return (
    <AdminPageShell
      templateId="page.admin.app-config.payment-methods"
      titleFallback="Payment Methods"
      descriptionFallback="Provider credentials and payment processing configuration."
      data={data}
      className={className}
    >
      {children}
    </AdminPageShell>
  );
}
