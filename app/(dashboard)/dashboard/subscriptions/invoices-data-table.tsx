'use client';

import {
  buildTableColumn,
  defineBuildTable,
  type BuildTableDefinition
} from '@skitsaas/sdk/datatables';
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
  labels: DashboardSubscriptionInvoicesDataTableProps['labels']
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
            slot="cell.reference"
          >
            {fallbackCell}
          </DashboardTableSlotTemplate>
        );
      }
    }
  ];
}

function getInvoiceTableDefinition({
  data,
  labels
}: {
  data: DashboardSubscriptionInvoiceRow[];
  labels: DashboardSubscriptionInvoicesDataTableProps['labels'];
}): BuildTableDefinition<DashboardSubscriptionInvoiceRow> {
  const definition: BuildTableDefinition<DashboardSubscriptionInvoiceRow> = {
    data,
    columns: [
      buildTableColumn.text<DashboardSubscriptionInvoiceRow>({
        key: 'updatedAt',
        header: (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            slot="header.date.sort"
            data={{
              sortKey: 'updatedAt'
            }}
          >
            <span>{labels.columns.date}</span>
          </DashboardTableSlotTemplate>
        ),
        sortable: true,
        cell: (row) => (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            slot="cell.date"
          >
            <span className="text-xs text-muted-foreground">
              {row.updatedAtLabel}
            </span>
          </DashboardTableSlotTemplate>
        )
      }),
      buildTableColumn.text<DashboardSubscriptionInvoiceRow>({
        key: 'scopeLabel',
        header: labels.columns.scope,
        searchable: true,
        cell: (row) => (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            slot="cell.scope"
          >
            <span className="text-xs text-muted-foreground">
              {row.scopeLabel}
            </span>
          </DashboardTableSlotTemplate>
        )
      }),
      buildTableColumn.text<DashboardSubscriptionInvoiceRow>({
        key: 'planLabel',
        header: labels.columns.plan,
        cell: (row) => (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            slot="cell.plan"
          >
            <span className="text-xs text-muted-foreground">
              {row.planLabel}
            </span>
          </DashboardTableSlotTemplate>
        )
      }),
      buildTableColumn.text<DashboardSubscriptionInvoiceRow>({
        key: 'provider',
        header: labels.columns.provider,
        cell: (row) => (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            slot="cell.provider"
          >
            <span className="text-xs text-muted-foreground">
              {row.provider}
            </span>
          </DashboardTableSlotTemplate>
        )
      }),
      buildTableColumn.text<DashboardSubscriptionInvoiceRow>({
        key: 'amountLabel',
        header: labels.columns.amount,
        cell: (row) => (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            slot="cell.amount"
          >
            <span className="text-xs text-muted-foreground">
              {row.amountLabel}
            </span>
          </DashboardTableSlotTemplate>
        )
      }),
      buildTableColumn.text<DashboardSubscriptionInvoiceRow>({
        key: 'reference',
        header: labels.columns.reference,
        cell: (row) => (
          <DashboardTableSlotTemplate
            templateId="section.dashboard.table.subscriptions.invoices.cell"
            slot="cell.reference"
          >
            <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
              {row.reference}
            </span>
          </DashboardTableSlotTemplate>
        )
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: labels.filterPlaceholder,
        columns: ['scopeLabel']
      }
    },
    pagination: {
      pageSize: 10
    }
  };

  return defineBuildTable<
    DashboardSubscriptionInvoiceRow,
    BuildTableDefinition<DashboardSubscriptionInvoiceRow>
  >(definition);
}

export function DashboardSubscriptionInvoicesDataTable({
  data,
  labels,
  tableTemplate
}: DashboardSubscriptionInvoicesDataTableProps) {
  return (
    <DataTable
      definition={getInvoiceTableDefinition({
        data,
        labels
      })}
      labels={labels.table}
      template={tableTemplate}
      emptyMessage={labels.empty}
      tableClassName="min-w-[1120px]"
    />
  );
}
