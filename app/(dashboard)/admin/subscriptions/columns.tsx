'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildTableColumn,
  buildTableFilter,
  defineBuildTable,
  type BuildTableDefinition
} from '@skitsaas/sdk/datatables';
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
            <Link href={`/admin/subscriptions/organization/${row.original.id}/edit`}>
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

export function getSubscriptionsTableDefinition({
  data,
  messages
}: {
  data: AdminSubscriptionRow[];
  messages: AdminMessages;
}): BuildTableDefinition<AdminSubscriptionRow> {
  const table = messages.subscriptionsTable;
  const statusLabels: Record<SubscriptionStatus, string> = {
    free: table.free,
    trialing: table.trialing,
    active: table.active,
    unpaid: table.unpaid,
    canceled: table.canceled
  };

  const definition: BuildTableDefinition<AdminSubscriptionRow> = {
    data,
    columns: [
      buildTableColumn.text<AdminSubscriptionRow>({
        key: 'name',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="header.team.sort"
          >
            <span>{table.teamHeader}</span>
          </AdminTableSlotTemplate>
        ),
        sortable: true,
        searchable: true,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="cell.team"
            data={{ teamId: row.id }}
          >
            <div className="min-w-[220px]">
              <p className="font-medium text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">
                {table.createdLabel} {row.createdAtLabel}
              </p>
            </div>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminSubscriptionRow>({
        key: 'membersCount',
        header: table.membersHeader,
        cell: (row) => (
          <span className="font-medium text-foreground">{row.membersCount}</span>
        )
      }),
      buildTableColumn.text<AdminSubscriptionRow>({
        key: 'paymentProvider',
        header: table.providerHeader,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="cell.provider"
            data={{ provider: row.paymentProvider }}
          >
            <span
              className={cn(
                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                getProviderClassName(row.paymentProvider)
              )}
            >
              {row.paymentProvider || table.none}
            </span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminSubscriptionRow>({
        key: 'subscriptionStatus',
        header: table.statusHeader,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="cell.status"
            data={{ status: row.subscriptionStatus }}
          >
            <span
              className={cn(
                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                getStatusClassName(row.subscriptionStatus)
              )}
            >
              {statusLabels[row.subscriptionStatus]}
            </span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminSubscriptionRow>({
        key: 'planName',
        header: table.planHeader,
        cell: (row) => (
          <div className="min-w-[150px] space-y-1">
            <p className="text-sm font-medium text-foreground">
              {row.planName || table.free}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.subscriptionTemplateId
                ? `#${row.subscriptionTemplateId}`
                : table.noTemplate}
            </p>
          </div>
        )
      }),
      buildTableColumn.text<AdminSubscriptionRow>({
        key: 'stripeSubscriptionId',
        header: table.idsHeader,
        cell: (row) => (
          <div className="min-w-[250px] space-y-1.5 text-xs">
            <p className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
              <span className="font-medium text-foreground">{table.stripe}:</span>{' '}
              <span
                className="font-mono text-[11px] text-muted-foreground"
                title={row.stripeSubscriptionId || '-'}
              >
                {row.stripeSubscriptionId || '-'}
              </span>
            </p>
            <p className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
              <span className="font-medium text-foreground">{table.paypal}:</span>{' '}
              <span
                className="font-mono text-[11px] text-muted-foreground"
                title={row.paypalSubscriptionId || '-'}
              >
                {row.paypalSubscriptionId || '-'}
              </span>
            </p>
          </div>
        )
      }),
      buildTableColumn.custom<AdminSubscriptionRow>({
        key: 'actions',
        header: table.actionsHeader,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.cell"
            slot="cell.actions.edit"
            data={{ teamId: row.id }}
          >
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/subscriptions/organization/${row.id}/edit`}>
                {messages.subscriptionsPage.edit}
              </Link>
            </Button>
          </AdminTableSlotTemplate>
        )
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: messages.subscriptionsPage.filterPlaceholder,
        columns: ['name']
      },
      filters: [
        buildTableFilter.select<AdminSubscriptionRow>({
          id: 'subscriptionStatus',
          label: table.statusHeader,
          column: 'subscriptionStatus',
          placeholder: table.statusHeader,
          options: [
            { value: 'active', label: table.active },
            { value: 'trialing', label: table.trialing },
            { value: 'free', label: table.free },
            { value: 'unpaid', label: table.unpaid },
            { value: 'canceled', label: table.canceled }
          ]
        }),
        buildTableFilter.select<AdminSubscriptionRow>({
          id: 'paymentProvider',
          label: table.providerHeader,
          column: 'paymentProvider',
          placeholder: table.providerHeader,
          options: [
            { value: 'stripe', label: 'Stripe' },
            { value: 'paypal', label: 'PayPal' }
          ]
        })
      ]
    },
    pagination: {
      pageSize: 10
    }
  };

  return defineBuildTable<
    AdminSubscriptionRow,
    BuildTableDefinition<AdminSubscriptionRow>
  >(definition);
}
