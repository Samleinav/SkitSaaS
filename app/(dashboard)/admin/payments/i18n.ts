import type { DataTableLabels } from '@/components/ui/data-table';
import type { Translator } from '@/lib/i18n/translator';

export type AdminPaymentsCopy = {
  title: string;
  description: string;
  filterPlaceholder: string;
  metrics: {
    completedPayments: string;
    stripePayments: string;
    paypalPayments: string;
    missingReferencePayments: string;
    missingReferenceHint: string;
  };
  table: {
    paidAtHeader: string;
    whoHeader: string;
    reasonHeader: string;
    providerHeader: string;
    originHeader: string;
    typeHeader: string;
    amountHeader: string;
    paymentReferenceHeader: string;
    purchaseOrderHeader: string;
    actionsHeader: string;
    noTeam: string;
    none: string;
    checkout: string;
    webhook: string;
    dashboard: string;
    system: string;
    preview: string;
    closePreview: string;
    orderLabel: string;
    eventLabel: string;
    messageLabel: string;
    invoiceTitle: string;
    invoiceDescription: string;
  };
  dataTable: DataTableLabels;
};

export function createAdminPaymentsCopy(t: Translator): AdminPaymentsCopy {
  return {
    title: t('Completed Payments'),
    description: t(
      'Successfully received payments with quick invoice preview and purchase-order relation.'
    ),
    filterPlaceholder: t('Filter by payer/team...'),
    metrics: {
      completedPayments: t('Completed payments'),
      stripePayments: t('Stripe payments'),
      paypalPayments: t('PayPal payments'),
      missingReferencePayments: t('Missing payment reference'),
      missingReferenceHint: t('Orders without external payment ID')
    },
    table: {
      paidAtHeader: t('Paid at'),
      whoHeader: t('Who'),
      reasonHeader: t('Why'),
      providerHeader: t('Provider'),
      originHeader: t('Origin'),
      typeHeader: t('Type'),
      amountHeader: t('Amount'),
      paymentReferenceHeader: t('Payment reference'),
      purchaseOrderHeader: t('Purchase order'),
      actionsHeader: t('Preview'),
      noTeam: t('No team'),
      none: t('none'),
      checkout: t('checkout'),
      webhook: t('webhook'),
      dashboard: t('dashboard'),
      system: t('system'),
      preview: t('Preview'),
      closePreview: t('Close'),
      orderLabel: t('Order #{id}'),
      eventLabel: t('Event'),
      messageLabel: t('Message'),
      invoiceTitle: t('Invoice preview'),
      invoiceDescription: t(
        'Quick summary of who paid, why, when, amount, source, type, and references.'
      )
    },
    dataTable: {
      filterPlaceholder: t('Filter...'),
      columns: t('Columns'),
      noResults: t('No results.'),
      showingRows: t('Showing {shown} of {filtered} row(s).'),
      previous: t('Previous'),
      next: t('Next')
    }
  };
}
