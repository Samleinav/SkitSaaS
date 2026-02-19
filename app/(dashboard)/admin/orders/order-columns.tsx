'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import { AdminTableSlotTemplate } from '../table-slot-template';

type OrderStatus = 'pending' | 'received' | 'canceled' | 'failed';

export type AdminOrderRow = {
  id: number;
  updatedAt: number;
  updatedAtLabel: string;
  teamName: string;
  provider: string;
  status: OrderStatus;
  source: string;
  paymentMethod: string;
  planLabel: string;
  amountLabel: string;
  externalPaymentId: string | null;
  externalOrderId: string | null;
  eventType: string;
  message: string;
};

function getStatusClassName(status: OrderStatus) {
  if (status === 'received') {
    return 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300';
  }

  if (status === 'pending') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (status === 'canceled') {
    return 'border-border bg-muted text-muted-foreground';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
}

export function getOrderColumns(
  messages: AdminMessages
): ColumnDef<AdminOrderRow>[] {
  const table = messages.ordersPage.table;
  const statusLabels: Record<OrderStatus, string> = {
    pending: table.pending,
    received: table.received,
    canceled: table.canceled,
    failed: table.failed
  };
  const sourceLabels: Record<string, string> = {
    checkout: table.checkout,
    webhook: table.webhook,
    dashboard: table.dashboard,
    system: table.system
  };

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
            {table.updatedHeader}
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.orders.cell"
            slot="header.updated-at.sort"
          >
            {fallbackHeader}
          </AdminTableSlotTemplate>
        );
      },
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.updatedAtLabel}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.orders.cell"
            slot="cell.updated-at"
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'teamName',
      header: table.teamHeader,
      cell: ({ row }) => (
        <span className="min-w-[180px] text-xs text-muted-foreground">
          {row.original.teamName}
        </span>
      )
    },
    {
      accessorKey: 'provider',
      header: table.providerHeader,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.provider}</span>
      )
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
            {statusLabels[row.original.status]}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.orders.cell"
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
      accessorKey: 'source',
      header: table.sourceHeader,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {sourceLabels[row.original.source] || row.original.source}
        </span>
      )
    },
    {
      accessorKey: 'paymentMethod',
      header: table.methodHeader,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.paymentMethod}
        </span>
      )
    },
    {
      accessorKey: 'planLabel',
      header: table.planHeader,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.planLabel}</span>
      )
    },
    {
      accessorKey: 'amountLabel',
      header: table.amountHeader,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.amountLabel}</span>
      )
    },
    {
      accessorKey: 'externalPaymentId',
      header: table.paymentReferenceHeader,
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
          {row.original.externalPaymentId || table.none}
        </span>
      )
    },
    {
      accessorKey: 'externalOrderId',
      header: table.orderReferenceHeader,
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
          {row.original.externalOrderId || table.none}
        </span>
      )
    },
    {
      accessorKey: 'eventType',
      header: table.eventHeader,
      cell: ({ row }) => (
        <span className="block max-w-[260px] truncate text-xs text-muted-foreground">
          {row.original.eventType}
        </span>
      )
    },
    {
      accessorKey: 'message',
      header: table.messageHeader,
      cell: ({ row }) => (
        <span className="block max-w-[280px] truncate text-xs text-muted-foreground">
          {row.original.message}
        </span>
      )
    },
    {
      id: 'actions',
      header: table.actionsHeader,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const fallbackCell = (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/orders/${row.original.id}/edit`}>{table.edit}</Link>
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.orders.cell"
            slot="cell.actions.edit"
            data={{
              orderId: row.original.id
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    }
  ];
}


