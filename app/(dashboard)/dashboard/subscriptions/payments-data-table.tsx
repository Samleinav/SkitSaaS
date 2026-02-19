'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import { DashboardTableSlotTemplate } from '../table-slot-template';
import { cn } from '@/lib/utils';

export type DashboardSubscriptionPaymentRow = {
  id: number;
  updatedAt: number;
  updatedAtLabel: string;
  scopeLabel: string;
  provider: string;
  status: 'pending' | 'received' | 'canceled' | 'failed';
  statusLabel: string;
  eventType: string;
  amountLabel: string;
  externalPaymentId: string;
  externalOrderId: string;
};

type DashboardSubscriptionPaymentsDataTableProps = {
  data: DashboardSubscriptionPaymentRow[];
  labels: {
    filterPlaceholder: string;
    empty: string;
    columns: {
      date: string;
      scope: string;
      provider: string;
      status: string;
      event: string;
      amount: string;
      paymentRef: string;
      orderRef: string;
    };
    table: {
      showingRows: string;
      previous: string;
      next: string;
    };
  };
  tableTemplate?: DataTableThemeTemplate;
};

function getStatusClassName(status: DashboardSubscriptionPaymentRow['status']) {
  if (status === 'received') {
    return 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300';
  }

  if (status === 'pending') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (status === 'failed') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }

  return 'border-border bg-muted text-muted-foreground';
}

function getPaymentColumns(
  labels: DashboardSubscriptionPaymentsDataTableProps['labels']
): ColumnDef<DashboardSubscriptionPaymentRow>[] {
  return [
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => {
        const fallbackHeader = (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {labels.columns.date}
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="header.date.sort"
          >
            {fallbackHeader}
          </DashboardTableSlotTemplate>
        );
      },
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.updatedAtLabel}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="cell.date"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'scopeLabel',
      header: labels.columns.scope,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.scopeLabel}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="cell.scope"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'provider',
      header: labels.columns.provider,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.provider}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="cell.provider"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'status',
      header: labels.columns.status,
      cell: ({ row }) => {
        const fallbackCell = (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getStatusClassName(row.original.status)
            )}
          >
            {row.original.statusLabel}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="cell.status"
            data={{
              status: row.original.status
            }}
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'eventType',
      header: labels.columns.event,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="block max-w-[320px] truncate text-xs text-muted-foreground">
            {row.original.eventType}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="cell.event"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'amountLabel',
      header: labels.columns.amount,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.amountLabel}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="cell.amount"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'externalPaymentId',
      header: labels.columns.paymentRef,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
            {row.original.externalPaymentId}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="cell.payment-reference"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'externalOrderId',
      header: labels.columns.orderRef,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
            {row.original.externalOrderId}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.payments.cell"
            slot="cell.order-reference"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    }
  ];
}

export function DashboardSubscriptionPaymentsDataTable({
  data,
  labels,
  tableTemplate
}: DashboardSubscriptionPaymentsDataTableProps) {
  return (
    <DataTable
      columns={getPaymentColumns(labels)}
      data={data}
      labels={labels.table}
      template={tableTemplate}
      filterColumn="scopeLabel"
      filterPlaceholder={labels.filterPlaceholder}
      emptyMessage={labels.empty}
      tableClassName="min-w-[1300px]"
    />
  );
}

