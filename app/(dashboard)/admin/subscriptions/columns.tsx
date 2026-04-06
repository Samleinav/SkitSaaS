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
import {
  getPaymentProviderClassName,
  getSubscriptionStatusClassName,
  type AdminNormalizedSubscriptionStatus
} from './presentation';
import { AdminTableSlotTemplate } from '../table-slot-template';
import type { AdminSubscriptionsCopy } from './i18n';

export type AdminSubscriptionRow = {
  id: number;
  name: string;
  createdAt: number;
  createdAtLabel: string;
  membersCount: number;
  paymentProvider: string | null;
  subscriptionStatus: AdminNormalizedSubscriptionStatus;
  planName: string | null;
  subscriptionTemplateId: number | null;
  planMetaLabel: string | null;
  providerReferenceId: string | null;
  providerPlanId: string | null;
  lifecycleLabel: string;
};

export function getColumns(
  copy: AdminSubscriptionsCopy
): ColumnDef<AdminSubscriptionRow>[] {
  const table = copy.organizationTable;
  const statusLabels: Record<AdminNormalizedSubscriptionStatus, string> = {
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
          <div className="min-w-[150px] space-y-1.5">
            <span
              className={getPaymentProviderClassName(
                row.original.paymentProvider
              )}
            >
              {row.original.paymentProvider || table.none}
            </span>
            {row.original.providerReferenceId ? (
              <p
                className="truncate font-mono text-[11px] text-muted-foreground"
                title={row.original.providerReferenceId}
              >
                {row.original.providerReferenceId}
              </p>
            ) : null}
          </div>
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
          <div className="min-w-[180px] space-y-1.5">
            <span
              className={getSubscriptionStatusClassName(
                row.original.subscriptionStatus
              )}
            >
              {statusLabels[row.original.subscriptionStatus]}
            </span>
            <p className="text-xs text-muted-foreground">
              {row.original.lifecycleLabel}
            </p>
          </div>
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
          {row.original.planMetaLabel ? (
            <p className="text-xs text-muted-foreground">
              {row.original.planMetaLabel}
            </p>
          ) : null}
        </div>
      )
    },
    {
      id: 'ids',
      header: table.idsHeader,
      enableSorting: false,
      cell: ({ row }) => {
        const hasIds =
          Boolean(row.original.providerReferenceId) ||
          Boolean(row.original.providerPlanId);

        return (
          <div className="min-w-[240px] space-y-1.5 text-xs">
            {row.original.providerReferenceId ? (
              <p className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
                <span className="font-medium text-foreground">Ref:</span>{' '}
                <span
                  className="font-mono text-[11px] text-muted-foreground"
                  title={row.original.providerReferenceId}
                >
                  {row.original.providerReferenceId}
                </span>
              </p>
            ) : null}
            {row.original.providerPlanId ? (
              <p className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
                <span className="font-medium text-foreground">Plan:</span>{' '}
                <span
                  className="font-mono text-[11px] text-muted-foreground"
                  title={row.original.providerPlanId}
                >
                  {row.original.providerPlanId}
                </span>
              </p>
            ) : null}
            {!hasIds ? (
              <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-2 py-1.5 text-muted-foreground">
                No provider identifiers
              </p>
            ) : null}
          </div>
        );
      }
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
              {table.edit}
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
  copy
}: {
  data: AdminSubscriptionRow[];
  copy: AdminSubscriptionsCopy;
}): BuildTableDefinition<AdminSubscriptionRow> {
  const table = copy.organizationTable;
  const statusLabels: Record<AdminNormalizedSubscriptionStatus, string> = {
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
            <div className="min-w-[150px] space-y-1.5">
              <span className={getPaymentProviderClassName(row.paymentProvider)}>
                {row.paymentProvider || table.none}
              </span>
              {row.providerReferenceId ? (
                <p
                  className="truncate font-mono text-[11px] text-muted-foreground"
                  title={row.providerReferenceId}
                >
                  {row.providerReferenceId}
                </p>
              ) : null}
            </div>
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
            <div className="min-w-[180px] space-y-1.5">
              <span
                className={getSubscriptionStatusClassName(row.subscriptionStatus)}
              >
                {statusLabels[row.subscriptionStatus]}
              </span>
              <p className="text-xs text-muted-foreground">
                {row.lifecycleLabel}
              </p>
            </div>
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
            {row.planMetaLabel ? (
              <p className="text-xs text-muted-foreground">
                {row.planMetaLabel}
              </p>
            ) : null}
          </div>
        )
      }),
      buildTableColumn.text<AdminSubscriptionRow>({
        key: 'providerReferenceId',
        header: table.idsHeader,
        cell: (row) => {
          const hasIds =
            Boolean(row.providerReferenceId) || Boolean(row.providerPlanId);

          return (
            <div className="min-w-[240px] space-y-1.5 text-xs">
              {row.providerReferenceId ? (
                <p className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
                  <span className="font-medium text-foreground">Ref:</span>{' '}
                  <span
                    className="font-mono text-[11px] text-muted-foreground"
                    title={row.providerReferenceId}
                  >
                    {row.providerReferenceId}
                  </span>
                </p>
              ) : null}
              {row.providerPlanId ? (
                <p className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
                  <span className="font-medium text-foreground">Plan:</span>{' '}
                  <span
                    className="font-mono text-[11px] text-muted-foreground"
                    title={row.providerPlanId}
                  >
                    {row.providerPlanId}
                  </span>
                </p>
              ) : null}
              {!hasIds ? (
                <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-2 py-1.5 text-muted-foreground">
                  No provider identifiers
                </p>
              ) : null}
            </div>
          );
        }
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
                {table.edit}
              </Link>
            </Button>
          </AdminTableSlotTemplate>
        )
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: table.filterPlaceholder,
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
