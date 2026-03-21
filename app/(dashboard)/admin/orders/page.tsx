import Link from 'next/link';
import {
  AdminMetricCard,
  AdminPageShell
} from '../admin-page-shell';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { Button } from '@/components/ui/button';
import {
  getPaymentOrdersForAdmin
} from '@/lib/db/queries.admin';
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../guards';
import { formatDateTime } from '../utils';
import { AdminOrdersDataTable } from './orders-data-table';
import type { AdminOrderRow } from './order-columns';
import { createAdminOrdersCopy } from './i18n';

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

export default async function AdminOrdersPage() {
  const [locale, t] = await Promise.all([
    getRequestLocale(),
    getServerTranslator({ area: 'admin' })
  ]);
  const dateLocale = getDateLocale(locale);
  const copy = createAdminOrdersCopy(t);
  const ordersTable = copy.table;

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
      <AdminMetricCard
        label={copy.metrics.receivedOrders}
        value={receivedOrders}
      />
      <AdminMetricCard label={copy.metrics.pendingOrders} value={pendingOrders} />
      <AdminMetricCard
        label={copy.metrics.canceledOrders}
        value={canceledOrders}
      />
      <AdminMetricCard label={copy.metrics.failedOrders} value={failedOrders} />
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
    <AdminPageShell
      title={copy.title}
      description={copy.description}
      actions={
        <Button asChild size="sm" className="rounded-lg">
          <Link href="/admin/orders/create">{copy.newOrder}</Link>
        </Button>
      }
      metrics={metricsSlot}
    >
      <AdminOrdersDataTable
        data={rows}
        copy={copy}
        tableTemplate={{
          componentId: 'ui.table',
          area: 'admin',
        }}
      />
    </AdminPageShell>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.orders"
      data={{
        title: copy.title,
        description: copy.description,
        createLabel: copy.newOrder
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
