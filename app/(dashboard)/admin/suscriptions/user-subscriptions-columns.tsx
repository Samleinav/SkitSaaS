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
import type { AdminUserDisplayStatus } from '../users/status';
import { AdminTableSlotTemplate } from '../table-slot-template';
import {
  getAccountStatusClassName,
  getPaymentProviderClassName,
  getSubscriptionStatusClassName,
  type AdminNormalizedSubscriptionStatus
} from '../subscriptions/presentation';
import type {
  AdminSubscriptionsCopy,
  AdminUserSubscriptionsTableCopy
} from '../subscriptions/i18n';

export type AdminUserSubscriptionRow = {
  id: number;
  name: string | null;
  email: string;
  role: string;
  status: AdminUserDisplayStatus;
  paymentProvider: string | null;
  providerReferenceId: string | null;
  providerPlanId: string | null;
  subscriptionStatus: AdminNormalizedSubscriptionStatus;
  subscriptionTemplateName: string | null;
  subscriptionTemplateId: number | null;
  subscriptionPlanMetaLabel: string | null;
  subscriptionLifecycleLabel: string;
  organizationsCount: number;
  ownedOrganizationsCount: number;
};

function getStatusClassName(status: AdminUserDisplayStatus) {
  if (status === 'active') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (status === 'suspended') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (status === 'banned') {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  }

  return 'border-border bg-muted text-muted-foreground';
}

function getStatusLabel(
  status: AdminUserDisplayStatus,
  usersTable: AdminUserSubscriptionsTableCopy
) {
  if (status === 'suspended') {
    return usersTable.statusSuspended;
  }

  if (status === 'banned') {
    return usersTable.statusBanned;
  }

  if (status === 'deleted') {
    return usersTable.statusDeleted;
  }

  return usersTable.statusActive;
}

export function getUserSubscriptionsColumns(
  copy: AdminSubscriptionsCopy
): ColumnDef<AdminUserSubscriptionRow>[] {
  const usersTable = copy.userTable;
  const subscriptionLabels = copy.organizationTable;
  const subscriptionStatusLabels: Record<AdminNormalizedSubscriptionStatus, string> =
    {
      free: subscriptionLabels.free,
      trialing: subscriptionLabels.trialing,
      active: subscriptionLabels.active,
      unpaid: subscriptionLabels.unpaid,
      canceled: subscriptionLabels.canceled
    };

  return [
    {
      accessorKey: 'email',
      header: ({ column }) => {
        const fallbackHeader = (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {usersTable.userHeader}
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.suscriptions.user.cell"
            slot="header.user.sort"
          >
            {fallbackHeader}
          </AdminTableSlotTemplate>
        );
      },
      cell: ({ row }) => {
        const fallbackCell = (
          <div className="min-w-[220px]">
            <p className="font-medium text-foreground">
              {row.original.name || usersTable.unnamedUser}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-medium capitalize text-foreground">
                {row.original.role}
              </span>
              {row.original.paymentProvider ? (
                <span className={getPaymentProviderClassName(row.original.paymentProvider)}>
                  {row.original.paymentProvider}
                </span>
              ) : null}
            </div>
          </div>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.suscriptions.user.cell"
            slot="cell.user"
            data={{
              userId: row.original.id
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'status',
      header: usersTable.statusHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <div className="min-w-[150px] space-y-1.5">
            <span
              className={getSubscriptionStatusClassName(
                row.original.subscriptionStatus
              )}
            >
              {subscriptionStatusLabels[row.original.subscriptionStatus]}
            </span>
            <span className={getAccountStatusClassName(getStatusClassName(row.original.status))}>
              {getStatusLabel(row.original.status, usersTable)}
            </span>
          </div>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.suscriptions.user.cell"
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
      accessorKey: 'subscriptionTemplateName',
      header: usersTable.subscriptionHeader,
      cell: ({ row }) => {
        const hasIds =
          Boolean(row.original.providerReferenceId) ||
          Boolean(row.original.providerPlanId);

        return (
          <div className="min-w-[220px] space-y-1">
            <p className="text-sm font-medium text-foreground">
              {row.original.subscriptionTemplateName || usersTable.noSubscription}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.subscriptionTemplateId
                ? `#${row.original.subscriptionTemplateId}`
                : usersTable.noSubscription}
            </p>
            {row.original.subscriptionPlanMetaLabel ? (
              <p className="text-xs text-muted-foreground">
                {row.original.subscriptionPlanMetaLabel}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {row.original.subscriptionLifecycleLabel}
            </p>
            {hasIds ? (
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {row.original.providerReferenceId || row.original.providerPlanId}
              </p>
            ) : null}
          </div>
        );
      }
    },
    {
      accessorKey: 'organizationsCount',
      header: usersTable.organizationsHeader,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {usersTable.organizationsCount
            .replace('{count}', String(row.original.organizationsCount))
            .replace('{owned}', String(row.original.ownedOrganizationsCount))}
        </span>
      )
    },
    {
      id: 'actions',
      header: usersTable.actionsHeader,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const fallbackCell = (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/subscriptions/user/${row.original.id}/edit`}>
              {usersTable.edit}
            </Link>
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.suscriptions.user.cell"
            slot="cell.actions.edit"
            data={{
              userId: row.original.id
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    }
  ];
}

export function getUserSubscriptionsTableDefinition({
  data,
  copy
}: {
  data: AdminUserSubscriptionRow[];
  copy: AdminSubscriptionsCopy;
}): BuildTableDefinition<AdminUserSubscriptionRow> {
  const usersTable = copy.userTable;
  const subscriptionLabels = copy.organizationTable;
  const subscriptionStatusLabels: Record<AdminNormalizedSubscriptionStatus, string> =
    {
      free: subscriptionLabels.free,
      trialing: subscriptionLabels.trialing,
      active: subscriptionLabels.active,
      unpaid: subscriptionLabels.unpaid,
      canceled: subscriptionLabels.canceled
    };

  const definition: BuildTableDefinition<AdminUserSubscriptionRow> = {
    data,
    columns: [
      buildTableColumn.text<AdminUserSubscriptionRow>({
        key: 'email',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.suscriptions.user.cell"
            slot="header.user.sort"
          >
            <span>{usersTable.userHeader}</span>
          </AdminTableSlotTemplate>
        ),
        sortable: true,
        searchable: true,
        filterValue: (row) => `${row.name ?? ''} ${row.email}`.trim(),
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.suscriptions.user.cell"
            slot="cell.user"
            data={{ userId: row.id }}
          >
            <div className="min-w-[220px]">
              <p className="font-medium text-foreground">
                {row.name || usersTable.unnamedUser}
              </p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-medium capitalize text-foreground">
                  {row.role}
                </span>
                {row.paymentProvider ? (
                  <span className={getPaymentProviderClassName(row.paymentProvider)}>
                    {row.paymentProvider}
                  </span>
                ) : null}
              </div>
            </div>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminUserSubscriptionRow>({
        key: 'status',
        header: usersTable.statusHeader,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.suscriptions.user.cell"
            slot="cell.status"
            data={{ status: row.status }}
          >
            <div className="min-w-[150px] space-y-1.5">
              <span
                className={getSubscriptionStatusClassName(row.subscriptionStatus)}
              >
                {subscriptionStatusLabels[row.subscriptionStatus]}
              </span>
              <span className={getAccountStatusClassName(getStatusClassName(row.status))}>
                {getStatusLabel(row.status, usersTable)}
              </span>
            </div>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminUserSubscriptionRow>({
        key: 'subscriptionTemplateName',
        header: usersTable.subscriptionHeader,
        cell: (row) => (
          <div className="min-w-[220px] space-y-1">
            <p className="text-sm font-medium text-foreground">
              {row.subscriptionTemplateName || usersTable.noSubscription}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.subscriptionTemplateId
                ? `#${row.subscriptionTemplateId}`
                : usersTable.noSubscription}
            </p>
            {row.subscriptionPlanMetaLabel ? (
              <p className="text-xs text-muted-foreground">
                {row.subscriptionPlanMetaLabel}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {row.subscriptionLifecycleLabel}
            </p>
            {row.providerReferenceId || row.providerPlanId ? (
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {row.providerReferenceId || row.providerPlanId}
              </p>
            ) : null}
          </div>
        )
      }),
      buildTableColumn.text<AdminUserSubscriptionRow>({
        key: 'organizationsCount',
        header: usersTable.organizationsHeader,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {usersTable.organizationsCount
              .replace('{count}', String(row.organizationsCount))
              .replace('{owned}', String(row.ownedOrganizationsCount))}
          </span>
        )
      }),
      buildTableColumn.custom<AdminUserSubscriptionRow>({
        key: 'actions',
        header: usersTable.actionsHeader,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.suscriptions.user.cell"
            slot="cell.actions.edit"
            data={{ userId: row.id }}
          >
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/subscriptions/user/${row.id}/edit`}>
                {usersTable.edit}
              </Link>
            </Button>
          </AdminTableSlotTemplate>
        )
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: usersTable.filterPlaceholder,
        columns: ['email']
      },
      filters: [
        buildTableFilter.select<AdminUserSubscriptionRow>({
          id: 'status',
          label: usersTable.statusHeader,
          column: 'status',
          placeholder: usersTable.statusHeader,
          options: [
            { value: 'active', label: usersTable.statusActive },
            { value: 'suspended', label: usersTable.statusSuspended },
            { value: 'banned', label: usersTable.statusBanned }
          ]
        })
      ]
    },
    pagination: {
      pageSize: 10
    }
  };

  return defineBuildTable<
    AdminUserSubscriptionRow,
    BuildTableDefinition<AdminUserSubscriptionRow>
  >(definition);
}
