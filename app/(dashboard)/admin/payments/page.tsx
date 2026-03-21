import {
  AdminMetricCard,
  AdminPageShell
} from '../admin-page-shell';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  getPaymentTransactionsForAdmin
} from '@/lib/db/queries.admin';
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../guards';
import { formatDateTime } from '../utils';
import { AdminPaymentsDataTable } from './payments-data-table';
import type { AdminPaymentDataRow } from './payment-data-columns';
import { createAdminPaymentsCopy } from './i18n';

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

function normalizeOrderSource(
  source: string | null | undefined
): AdminPaymentDataRow['source'] {
  if (
    source === 'checkout' ||
    source === 'webhook' ||
    source === 'dashboard' ||
    source === 'system'
  ) {
    return source;
  }

  return 'system';
}

export default async function AdminPaymentsPage() {
  const [locale, t] = await Promise.all([
    getRequestLocale(),
    getServerTranslator({ area: 'admin' })
  ]);
  const dateLocale = getDateLocale(locale);
  const copy = createAdminPaymentsCopy(t);

  await requireAdminAccess();

  let rows: AdminPaymentDataRow[] = [];

  const transactions = await getPaymentTransactionsForAdmin(800);
  const settledTransactions = transactions.filter(
    (transaction) => transaction.status === 'succeeded'
  );

  rows = settledTransactions.map((transaction) => ({
    id: transaction.orderId ?? transaction.id,
    paidAt: transaction.occurredAt.getTime(),
    paidAtLabel: formatDateTime(transaction.occurredAt, dateLocale),
    payer:
      transaction.teamName ||
      (transaction.orderTeamId
        ? `team:${transaction.orderTeamId}`
        : copy.table.noTeam),
    reason:
      transaction.planName ||
      transaction.templateName ||
      transaction.orderEventType ||
      transaction.transactionType,
    provider: transaction.provider,
    source: normalizeOrderSource(transaction.orderSource),
    paymentType: transaction.paymentMethod || transaction.transactionType,
    amountLabel: formatAmount(transaction.amount, transaction.currency, dateLocale),
    paymentReference:
      transaction.externalTransactionId || transaction.orderExternalPaymentId,
    purchaseOrderReference:
      transaction.externalInvoiceId || transaction.orderExternalOrderId,
    eventType: transaction.orderEventType || transaction.transactionType,
    message: transaction.orderMessage || '-'
  }));

  const totalPayments = rows.length;
  const stripePayments = rows.filter((row) => row.provider === 'stripe').length;
  const paypalPayments = rows.filter((row) => row.provider === 'paypal').length;
  const missingPaymentReference = rows.filter(
    (row) => !row.paymentReference
  ).length;
  const themeSelection = await getThemeSelectionForArea('admin');
  const metricsFallback = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        label={copy.metrics.completedPayments}
        value={totalPayments}
      />
      <AdminMetricCard
        label={copy.metrics.stripePayments}
        value={stripePayments}
      />
      <AdminMetricCard
        label={copy.metrics.paypalPayments}
        value={paypalPayments}
      />
      <AdminMetricCard
        label={copy.metrics.missingReferencePayments}
        value={missingPaymentReference}
        hint={copy.metrics.missingReferenceHint}
      />
    </div>
  );
  const metricsSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="section.admin.metrics-grid"
      data={{
        variant: 'payments',
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
      metrics={metricsSlot}
    >
      <AdminPaymentsDataTable
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
      id="page.admin.payments"
      data={{
        title: copy.title,
        description: copy.description
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
