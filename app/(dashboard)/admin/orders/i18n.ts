import type { DataTableLabels } from '@/components/ui/data-table';
import type { Translator } from '@/lib/i18n/translator';

export type AdminOrdersCopy = {
  title: string;
  description: string;
  filterPlaceholder: string;
  newOrder: string;
  metrics: {
    receivedOrders: string;
    pendingOrders: string;
    canceledOrders: string;
    failedOrders: string;
  };
  table: {
    updatedHeader: string;
    teamHeader: string;
    providerHeader: string;
    statusHeader: string;
    sourceHeader: string;
    methodHeader: string;
    planHeader: string;
    amountHeader: string;
    paymentReferenceHeader: string;
    orderReferenceHeader: string;
    eventHeader: string;
    messageHeader: string;
    actionsHeader: string;
    none: string;
    noTeam: string;
    pending: string;
    received: string;
    canceled: string;
    failed: string;
    checkout: string;
    webhook: string;
    dashboard: string;
    system: string;
    edit: string;
  };
  dataTable: DataTableLabels;
};

export function createAdminOrdersCopy(t: Translator): AdminOrdersCopy {
  return {
    title: t('Orders'),
    description: t(
      'Unified order records from Stripe and PayPal with plan and payment method context.'
    ),
    filterPlaceholder: t('Filter by team...'),
    newOrder: t('New order'),
    metrics: {
      receivedOrders: t('Received orders'),
      pendingOrders: t('Pending orders'),
      canceledOrders: t('Canceled orders'),
      failedOrders: t('Failed orders')
    },
    table: {
      updatedHeader: t('Updated'),
      teamHeader: t('Team'),
      providerHeader: t('Provider'),
      statusHeader: t('Status'),
      sourceHeader: t('Source'),
      methodHeader: t('Payment method'),
      planHeader: t('Plan'),
      amountHeader: t('Amount'),
      paymentReferenceHeader: t('Payment reference'),
      orderReferenceHeader: t('Order reference'),
      eventHeader: t('Event'),
      messageHeader: t('Message'),
      actionsHeader: t('Actions'),
      none: t('none'),
      noTeam: t('No team'),
      pending: t('pending'),
      received: t('received'),
      canceled: t('canceled'),
      failed: t('failed'),
      checkout: t('checkout'),
      webhook: t('webhook'),
      dashboard: t('dashboard'),
      system: t('system'),
      edit: t('Edit')
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
