import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getPaymentTransactionsForAdmin } from '@/lib/db/queries';
import { getServerLocaleAndMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../guards';
import { formatDateTime } from '../utils';
import { AdminPaymentsDataTable } from './payments-data-table';
import type { AdminPaymentDataRow } from './payment-data-columns';

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

type MetricCardProps = {
  label: string;
  value: number;
  hint?: string;
};

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
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
  const { locale, messages } = await getServerLocaleAndMessages('admin');
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';
  const paymentsPage = messages.paymentsPage;

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
        : paymentsPage.table.noTeam),
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
      <MetricCard
        label={paymentsPage.metrics.completedPayments}
        value={totalPayments}
      />
      <MetricCard
        label={paymentsPage.metrics.stripePayments}
        value={stripePayments}
      />
      <MetricCard
        label={paymentsPage.metrics.paypalPayments}
        value={paypalPayments}
      />
      <MetricCard
        label={paymentsPage.metrics.missingReferencePayments}
        value={missingPaymentReference}
        hint={paymentsPage.metrics.missingReferenceHint}
      />
    </div>
  );
  const metricsSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="section.admin.metrics-grid"
      themeId={themeSelection.themeKey}
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
    <div className="space-y-6">
      {metricsSlot}

      <Card>
        <CardHeader>
          <CardTitle>{paymentsPage.title}</CardTitle>
          <CardDescription>{paymentsPage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminPaymentsDataTable
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
      id="page.admin.payments"
      themeId={themeSelection.themeKey}
      data={{
        title: paymentsPage.title,
        description: paymentsPage.description
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}

