'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import { DashboardTableSlotTemplate } from '../table-slot-template';

export type DashboardSubscriptionInvoiceRow = {
  id: number;
  updatedAt: number;
  updatedAtLabel: string;
  scopeLabel: string;
  planLabel: string;
  provider: string;
  amountLabel: string;
  reference: string;
};

type DashboardSubscriptionInvoicesDataTableProps = {
  data: DashboardSubscriptionInvoiceRow[];
  labels: {
    filterPlaceholder: string;
    empty: string;
    columns: {
      date: string;
      scope: string;
      plan: string;
      provider: string;
      amount: string;
      reference: string;
    };
    table: {
      showingRows: string;
      previous: string;
      next: string;
    };
  };
  tableTemplate?: DataTableThemeTemplate;
};

function getInvoiceColumns(
  labels: DashboardSubscriptionInvoicesDataTableProps['labels'],
  themeId: string | null = null
): ColumnDef<DashboardSubscriptionInvoiceRow>[] {
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
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            themeId={themeId}
            slot="header.date.sort"
            data={{
              sortKey: 'updatedAt'
            }}
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
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            themeId={themeId}
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
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            themeId={themeId}
            slot="cell.scope"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'planLabel',
      header: labels.columns.plan,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.planLabel}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            themeId={themeId}
            slot="cell.plan"
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
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            themeId={themeId}
            slot="cell.provider"
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
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            themeId={themeId}
            slot="cell.amount"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'reference',
      header: labels.columns.reference,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
            {row.original.reference}
          </span>
        );

        return (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            themeId={themeId}
            slot="cell.reference"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    }
  ];
}

export function DashboardSubscriptionInvoicesDataTable({
  data,
  labels,
  tableTemplate
}: DashboardSubscriptionInvoicesDataTableProps) {
  return (
    <DataTable
      columns={getInvoiceColumns(labels, tableTemplate?.themeId ?? null)}
      data={data}
      labels={labels.table}
      template={tableTemplate}
      filterColumn="scopeLabel"
      filterPlaceholder={labels.filterPlaceholder}
      emptyMessage={labels.empty}
      tableClassName="min-w-[1120px]"
    />
  );
}
