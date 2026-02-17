import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getPaymentOrderFormOptionsForAdmin } from '@/lib/db/queries';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../guards';
import { AdminCreateOrderForm } from './create-order-form';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveInitialTargetType(
  value: string | string[] | undefined
): 'team' | 'user' {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'user' ? 'user' : 'team';
}

export default async function AdminCreateOrderPage({ searchParams }: PageProps) {
  const messages = await getServerMessages('admin');
  const ordersPage = messages.ordersPage;
  await requireAdminAccess();
  const resolvedSearchParams = await searchParams;
  const initialTargetType = resolveInitialTargetType(
    resolvedSearchParams.targetType
  );

  const formOptions = await getPaymentOrderFormOptionsForAdmin();
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{ordersPage.createTitle}</CardTitle>
          <CardDescription>{ordersPage.createDescription}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">{ordersPage.backToOrders}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <AdminCreateOrderForm
          formOptions={formOptions}
          messages={messages}
          initialTargetType={initialTargetType}
        />
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.admin.orders.create"
      themeId={themeSelection.themeKey}
      data={{
        title: ordersPage.createTitle,
        description: ordersPage.createDescription,
        initialTargetType: initialTargetType
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
