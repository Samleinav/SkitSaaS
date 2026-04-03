'use client';

import {
  buildTableColumn,
  buildTableFilter,
  defineBuildTable,
  type BuildTableDefinition
} from '@skitsaas/sdk/datatables';
import { cn } from '@/lib/utils';
import {
  getCheckoutCallbackOutcome,
  type CheckoutCallbackOutcome
} from '../payments/callback-attempts';
import type { AdminLogsCopy } from './i18n';

export type AdminCheckoutLogOrderType =
  | 'subscription'
  | 'one_time'
  | 'unknown';

export type AdminCheckoutLogOwnerType = 'core' | 'module' | 'unknown';

export type AdminCheckoutLogRow = {
  id: number;
  createdAt: number;
  createdAtLabel: string;
  eventType: string;
  outcome: CheckoutCallbackOutcome;
  paymentMethodId: string;
  provider: string;
  orderType: AdminCheckoutLogOrderType;
  ownerType: AdminCheckoutLogOwnerType;
  ownerLabel: string;
  targetLabel: string;
  source: string;
  checkoutLabel: string;
  providerIdsLabel: string;
  message: string;
};

function getOutcomeClassName(outcome: CheckoutCallbackOutcome) {
  if (outcome === 'replayed') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  }

  if (outcome === 'provider_pending') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (outcome === 'failed') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }

  if (outcome === 'ignored') {
    return 'border-border bg-muted text-muted-foreground';
  }

  if (outcome === 'succeeded') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  return 'border-border bg-muted text-muted-foreground';
}

function getOutcomeLabel(
  outcome: CheckoutCallbackOutcome,
  copy: AdminLogsCopy['checkout']['table']
) {
  if (outcome === 'replayed') {
    return copy.replayed;
  }

  if (outcome === 'provider_pending') {
    return copy.providerPending;
  }

  if (outcome === 'failed') {
    return copy.failed;
  }

  if (outcome === 'ignored') {
    return copy.ignored;
  }

  if (outcome === 'succeeded') {
    return copy.succeeded;
  }

  return copy.unknown;
}

function getOrderTypeLabel(
  orderType: AdminCheckoutLogOrderType,
  copy: AdminLogsCopy['checkout']['table']
) {
  if (orderType === 'one_time') {
    return copy.orderTypeOneTime;
  }

  if (orderType === 'subscription') {
    return copy.orderTypeSubscription;
  }

  return copy.unknown;
}

export function getCheckoutLogTableDefinition({
  data,
  copy
}: {
  data: AdminCheckoutLogRow[];
  copy: AdminLogsCopy;
}): BuildTableDefinition<AdminCheckoutLogRow> {
  const table = copy.checkout.table;
  const providerOptions = Array.from(
    new Set(data.map((row) => row.provider).filter(Boolean))
  )
    .sort((a, b) => a.localeCompare(b))
    .map((provider) => ({
      value: provider,
      label: provider
    }));

  const definition: BuildTableDefinition<AdminCheckoutLogRow> = {
    data,
    columns: [
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'createdAt',
        header: table.createdHeader,
        sortable: true,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.createdAtLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'outcome',
        header: table.outcomeHeader,
        cell: (row) => (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getOutcomeClassName(row.outcome)
            )}
          >
            {getOutcomeLabel(row.outcome, table)}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'eventType',
        header: table.eventHeader,
        searchable: true,
        cell: (row) => (
          <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
            {row.eventType}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'paymentMethodId',
        header: table.methodHeader,
        searchable: true,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.paymentMethodId}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'provider',
        header: table.providerHeader,
        searchable: true
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'orderType',
        header: table.orderTypeHeader,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {getOrderTypeLabel(row.orderType, table)}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'ownerLabel',
        header: table.ownerHeader,
        searchable: true,
        cell: (row) => (
          <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
            {row.ownerLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'targetLabel',
        header: table.targetHeader,
        searchable: true,
        cell: (row) => (
          <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
            {row.targetLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'source',
        header: table.sourceHeader,
        searchable: true,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{row.source}</span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'checkoutLabel',
        header: table.checkoutHeader,
        searchable: true,
        cell: (row) => (
          <span className="block max-w-[240px] truncate text-xs text-muted-foreground">
            {row.checkoutLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'providerIdsLabel',
        header: table.providerIdsHeader,
        searchable: true,
        cell: (row) => (
          <span className="block max-w-[300px] truncate text-xs text-muted-foreground">
            {row.providerIdsLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminCheckoutLogRow>({
        key: 'message',
        header: table.messageHeader,
        searchable: true,
        cell: (row) => (
          <span className="block max-w-[320px] truncate text-xs text-muted-foreground">
            {row.message}
          </span>
        )
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: copy.checkout.filterPlaceholder,
        columns: [
          'eventType',
          'paymentMethodId',
          'provider',
          'ownerLabel',
          'targetLabel',
          'source',
          'checkoutLabel',
          'providerIdsLabel',
          'message'
        ]
      },
      filters: [
        buildTableFilter.select<AdminCheckoutLogRow>({
          id: 'outcome',
          label: table.outcomeHeader,
          column: 'outcome',
          placeholder: table.outcomeHeader,
          options: [
            { value: 'replayed', label: table.replayed },
            { value: 'provider_pending', label: table.providerPending },
            { value: 'failed', label: table.failed },
            { value: 'ignored', label: table.ignored },
            { value: 'succeeded', label: table.succeeded },
            { value: 'unknown', label: table.unknown }
          ]
        }),
        buildTableFilter.select<AdminCheckoutLogRow>({
          id: 'provider',
          label: table.providerHeader,
          column: 'provider',
          placeholder: table.providerHeader,
          options: providerOptions
        }),
        buildTableFilter.select<AdminCheckoutLogRow>({
          id: 'ownerType',
          label: table.ownerHeader,
          column: 'ownerType',
          placeholder: table.ownerHeader,
          options: [
            { value: 'core', label: table.ownerCore },
            { value: 'module', label: table.ownerModule },
            { value: 'unknown', label: table.ownerUnknown }
          ]
        }),
        buildTableFilter.select<AdminCheckoutLogRow>({
          id: 'orderType',
          label: table.orderTypeHeader,
          column: 'orderType',
          placeholder: table.orderTypeHeader,
          options: [
            { value: 'subscription', label: table.orderTypeSubscription },
            { value: 'one_time', label: table.orderTypeOneTime },
            { value: 'unknown', label: table.unknown }
          ]
        })
      ]
    },
    pagination: {
      pageSize: 10
    }
  };

  return defineBuildTable<
    AdminCheckoutLogRow,
    BuildTableDefinition<AdminCheckoutLogRow>
  >(definition);
}

export { getCheckoutCallbackOutcome };
