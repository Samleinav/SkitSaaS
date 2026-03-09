'use client';

import {
  buildTableColumn,
  buildTableFilter,
  defineBuildTable,
  type BuildTableDefinition
} from '@skitsaas/sdk/datatables';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import { AdminTableSlotTemplate } from '../table-slot-template';

export type AdminSystemLogRow = {
  id: number;
  createdAt: number;
  createdAtLabel: string;
  eventType: string;
  eventCategory: string;
  action: string;
  status: string;
  actorLabel: string;
  targetLabel: string;
  teamLabel: string;
  entityLabel: string;
  sourceLabel: string;
  ipAddress: string;
  message: string;
};

function getStatusClassName(status: string) {
  if (status === 'success') {
    return 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300';
  }

  if (status === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (status === 'failed') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }

  return 'border-border bg-muted text-muted-foreground';
}

export function getLogColumns(
  messages: AdminMessages
): ColumnDef<AdminSystemLogRow>[] {
  const table = messages.logsPage.table;
  const statusLabels: Record<string, string> = {
    info: table.info,
    success: table.success,
    warning: table.warning,
    failed: table.failed
  };

  return [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        const fallbackHeader = (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {table.createdHeader}
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.logs.cell"
            slot="header.created-at.sort"
          >
            {fallbackHeader}
          </AdminTableSlotTemplate>
        );
      },
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.createdAtLabel}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.logs.cell"
            slot="cell.created-at"
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'eventType',
      header: table.eventHeader,
      cell: ({ row }) => (
        <span className="min-w-[220px] text-xs text-muted-foreground">
          {row.original.eventType}
        </span>
      )
    },
    {
      accessorKey: 'eventCategory',
      header: table.categoryHeader
    },
    {
      accessorKey: 'action',
      header: table.actionHeader
    },
    {
      accessorKey: 'status',
      header: table.statusHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getStatusClassName(row.original.status)
            )}
          >
            {statusLabels[row.original.status] || row.original.status}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.logs.cell"
            slot="cell.status"
            data={{
              status: row.original.status
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'actorLabel',
      header: table.actorHeader,
      cell: ({ row }) => (
        <span className="block max-w-[260px] truncate text-xs text-muted-foreground">
          {row.original.actorLabel}
        </span>
      )
    },
    {
      accessorKey: 'targetLabel',
      header: table.targetHeader
    },
    {
      accessorKey: 'teamLabel',
      header: table.teamHeader
    },
    {
      accessorKey: 'entityLabel',
      header: table.entityHeader,
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
          {row.original.entityLabel}
        </span>
      )
    },
    {
      accessorKey: 'sourceLabel',
      header: table.sourceHeader
    },
    {
      accessorKey: 'ipAddress',
      header: table.ipHeader,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.ipAddress}</span>
      )
    },
    {
      accessorKey: 'message',
      header: table.messageHeader,
      cell: ({ row }) => (
        <span className="block max-w-[320px] truncate text-xs text-muted-foreground">
          {row.original.message}
        </span>
      )
    }
  ];
}

export function getLogTableDefinition({
  data,
  messages
}: {
  data: AdminSystemLogRow[];
  messages: AdminMessages;
}): BuildTableDefinition<AdminSystemLogRow> {
  const table = messages.logsPage.table;
  const statusLabels: Record<string, string> = {
    info: table.info,
    success: table.success,
    warning: table.warning,
    failed: table.failed
  };

  const definition: BuildTableDefinition<AdminSystemLogRow> = {
    data,
    columns: [
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'createdAt',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.logs.cell"
            slot="header.created-at.sort"
          >
            <span>{table.createdHeader}</span>
          </AdminTableSlotTemplate>
        ),
        sortable: true,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.logs.cell"
            slot="cell.created-at"
          >
            <span className="text-xs text-muted-foreground">
              {row.createdAtLabel}
            </span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'eventType',
        header: table.eventHeader,
        searchable: true,
        cell: (row) => (
          <span className="min-w-[220px] text-xs text-muted-foreground">
            {row.eventType}
          </span>
        )
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'eventCategory',
        header: table.categoryHeader
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'action',
        header: table.actionHeader
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'status',
        header: table.statusHeader,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.logs.cell"
            slot="cell.status"
            data={{
              status: row.status
            }}
          >
            <span
              className={cn(
                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                getStatusClassName(row.status)
              )}
            >
              {statusLabels[row.status] || row.status}
            </span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'actorLabel',
        header: table.actorHeader,
        cell: (row) => (
          <span className="block max-w-[260px] truncate text-xs text-muted-foreground">
            {row.actorLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'targetLabel',
        header: table.targetHeader
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'teamLabel',
        header: table.teamHeader
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'entityLabel',
        header: table.entityHeader,
        cell: (row) => (
          <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
            {row.entityLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'sourceLabel',
        header: table.sourceHeader
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'ipAddress',
        header: table.ipHeader,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{row.ipAddress}</span>
        )
      }),
      buildTableColumn.text<AdminSystemLogRow>({
        key: 'message',
        header: table.messageHeader,
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
        placeholder: messages.logsPage.filterPlaceholder,
        columns: ['eventType']
      },
      filters: [
        buildTableFilter.select<AdminSystemLogRow>({
          id: 'status',
          label: table.statusHeader,
          column: 'status',
          placeholder: table.statusHeader,
          options: [
            { value: 'info', label: table.info },
            { value: 'success', label: table.success },
            { value: 'warning', label: table.warning },
            { value: 'failed', label: table.failed }
          ]
        })
      ]
    },
    pagination: {
      pageSize: 10
    }
  };

  return defineBuildTable<
    AdminSystemLogRow,
    BuildTableDefinition<AdminSystemLogRow>
  >(definition);
}
