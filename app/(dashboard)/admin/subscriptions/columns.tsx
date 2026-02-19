'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import { cn } from '@/lib/utils';
import { AdminTableSlotTemplate } from '../table-slot-template';

type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'unpaid'
  | 'canceled';

export type AdminSubscriptionTemplateOption = {
  id: number;
  name: string;
  displayLabel: string;
  featureSummary: string;
};

export type AdminSubscriptionRow = {
  id: number;
  name: string;
  createdAt: number;
  createdAtLabel: string;
  membersCount: number;
  paymentProvider: string | null;
  subscriptionStatus: SubscriptionStatus;
  planName: string | null;
  subscriptionTemplateId: number | null;
  stripeSubscriptionId: string | null;
  paypalSubscriptionId: string | null;
};

function getStatusClassName(status: SubscriptionStatus) {
  if (status === 'active') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (status === 'trialing') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (status === 'unpaid') {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  }

  if (status === 'canceled') {
    return 'border-border bg-muted text-muted-foreground';
  }

  return 'border-border bg-muted text-muted-foreground';
}

function getProviderClassName(provider: string | null) {
  if (provider === 'stripe') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300';
  }

  if (provider === 'paypal') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  }

  if (!provider) {
    return 'border-border bg-muted text-muted-foreground';
  }

  return 'border-primary/30 bg-primary/10 text-primary';
}

export function getColumns(
  _templates: AdminSubscriptionTemplateOption[],
  messages: AdminMessages
): ColumnDef<AdminSubscriptionRow>[] {
  const table = messages.subscriptionsTable;
  const statusLabels: Record<SubscriptionStatus, string> = {
    free: table.free,
    trialing: table.trialing,
    active: table.active,
    unpaid: table.unpaid,
    canceled: table.canceled
  };

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        const fallbackHeader = (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {table.teamHeader}
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="header.team.sort"
          >
            {fallbackHeader}
          </AdminTableSlotTemplate>
        );
      },
      cell: ({ row }) => {
        const fallbackCell = (
          <div className="min-w-[220px]">
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {table.createdLabel} {row.original.createdAtLabel}
            </p>
          </div>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="cell.team"
            data={{
              teamId: row.original.id
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'membersCount',
      header: table.membersHeader,
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.membersCount}</span>
      )
    },
    {
      accessorKey: 'paymentProvider',
      header: table.providerHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getProviderClassName(row.original.paymentProvider)
            )}
          >
            {row.original.paymentProvider || table.none}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="cell.provider"
            data={{
              provider: row.original.paymentProvider
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'subscriptionStatus',
      header: table.statusHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getStatusClassName(row.original.subscriptionStatus)
            )}
          >
            {statusLabels[row.original.subscriptionStatus]}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="cell.status"
            data={{
              status: row.original.subscriptionStatus
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'planName',
      header: table.planHeader,
      cell: ({ row }) => (
        <div className="min-w-[150px] space-y-1">
          <p className="text-sm font-medium text-foreground">
            {row.original.planName || table.free}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.subscriptionTemplateId
              ? `#${row.original.subscriptionTemplateId}`
              : table.noTemplate}
          </p>
        </div>
      )
    },
    {
      id: 'ids',
      header: table.idsHeader,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-[250px] space-y-1.5 text-xs">
          <p className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
            <span className="font-medium text-foreground">{table.stripe}:</span>{' '}
            <span
              className="font-mono text-[11px] text-muted-foreground"
              title={row.original.stripeSubscriptionId || '-'}
            >
              {row.original.stripeSubscriptionId || '-'}
            </span>
          </p>
          <p className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
            <span className="font-medium text-foreground">{table.paypal}:</span>{' '}
            <span
              className="font-mono text-[11px] text-muted-foreground"
              title={row.original.paypalSubscriptionId || '-'}
            >
              {row.original.paypalSubscriptionId || '-'}
            </span>
          </p>
        </div>
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
            <Link href={`/admin/suscriptions/organization/${row.original.id}/edit`}>
              {messages.subscriptionsPage.edit}
            </Link>
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="cell.actions.edit"
            data={{
              teamId: row.original.id
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    }
  ];
}


