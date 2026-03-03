import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { Button } from '@/components/ui/button';
import {
  getPaymentOrdersForAdmin
} from '@/lib/db/queries.admin';
import { getServerLocaleAndMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../guards';
import { formatDateTime } from '../utils';
import { AdminOrdersDataTable } from './orders-data-table';
import type { AdminOrderRow } from './order-columns';

function formatAmount(
  amount: number | null,
  currency: string | null,
  locale: string
) {
  if (amount === null || !currency) {
    return '-';
  }

  const normalizedCurrency = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${normalizedCurrency}`;
  }
}

function normalizeOrderStatus(
  status: string | null
): AdminOrderRow['status'] {
  if (
    status === 'pending' ||
    status === 'received' ||
    status === 'canceled' ||
    status === 'failed'
  ) {
    return status;
  }

  return 'pending';
}

function isTemplateMaintenanceOrderEvent(eventType: string) {
  return eventType.startsWith('subscription.template.');
}

type MetricCardProps = {
  label: string;
  value: number;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminOrdersPage() {
  const { locale, messages } = await getServerLocaleAndMessages('admin');
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';
  const ordersPage = messages.ordersPage;
  const ordersTable = ordersPage.table;

  await requireAdminAccess();

  const orders = await getPaymentOrdersForAdmin(500);
  const visibleOrders = orders.filter(
    (order) => !isTemplateMaintenanceOrderEvent(order.eventType)
  );

  const rows: AdminOrderRow[] = visibleOrders.map((order) => ({
    id: order.id,
    updatedAt: order.updatedAt.getTime(),
    updatedAtLabel: formatDateTime(order.updatedAt, dateLocale),
    teamName:
      order.teamName ||
      (order.teamId ? `team:${order.teamId}` : ordersTable.noTeam),
    provider: order.provider,
    status: normalizeOrderStatus(order.status),
    source: order.source,
    paymentMethod: order.paymentMethod || ordersTable.none,
    planLabel: order.planName || order.templateName || ordersTable.none,
    amountLabel: formatAmount(order.amount, order.currency, dateLocale),
    externalPaymentId: order.externalPaymentId,
    externalOrderId: order.externalOrderId,
    eventType: order.eventType,
    message: order.message || '-'
  }));

  const receivedOrders = rows.filter((row) => row.status === 'received').length;
  const pendingOrders = rows.filter((row) => row.status === 'pending').length;
  const canceledOrders = rows.filter((row) => row.status === 'canceled').length;
  const failedOrders = rows.filter((row) => row.status === 'failed').length;
  const themeSelection = await getThemeSelectionForArea('admin');
  const metricsFallback = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label={ordersPage.metrics.receivedOrders}
        value={receivedOrders}
      />
      <MetricCard label={ordersPage.metrics.pendingOrders} value={pendingOrders} />
      <MetricCard
        label={ordersPage.metrics.canceledOrders}
        value={canceledOrders}
      />
      <MetricCard label={ordersPage.metrics.failedOrders} value={failedOrders} />
    </div>
  );
  const metricsSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="section.admin.metrics-grid"
      data={{
        variant: 'orders',
        columns: 4
      }}
      fallback={metricsFallback}
    >
      {metricsFallback}
    </ThemeCodeTemplate>
  ) : (
    metricsFallback
  );

  const fallbackPage = (
    <div className="space-y-6">
      {metricsSlot}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{ordersPage.title}</CardTitle>
            <CardDescription>{ordersPage.description}</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders/create">{ordersPage.newOrder}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <AdminOrdersDataTable
            data={rows}
            messages={messages}
            tableTemplate={{
              componentId: 'ui.table',
              area: 'admin',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.orders"
      data={{
        title: ordersPage.title,
        description: ordersPage.description,
        createLabel: ordersPage.newOrder
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}

