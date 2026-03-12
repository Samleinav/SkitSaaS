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
import type { AdminUserDisplayStatus } from '../users/status';
import { AdminTableSlotTemplate } from '../table-slot-template';

export type AdminUserSubscriptionRow = {
  id: number;
  name: string | null;
  email: string;
  role: string;
  status: AdminUserDisplayStatus;
  subscriptionTemplateName: string | null;
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

function getStatusLabel(status: AdminUserDisplayStatus, messages: AdminMessages) {
  if (status === 'suspended') {
    return messages.userDetailPage.status.suspended;
  }

  if (status === 'banned') {
    return messages.userDetailPage.status.banned;
  }

  if (status === 'deleted') {
    return messages.userDetailPage.status.deleted;
  }

  return messages.userDetailPage.status.active;
}

export function getUserSubscriptionsColumns(
  messages: AdminMessages
): ColumnDef<AdminUserSubscriptionRow>[] {
  const usersTable = messages.usersTable;
  const subscriptionsPage = messages.subscriptionsPage;

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
      accessorKey: 'role',
      header: usersTable.roleHeader,
      cell: ({ row }) => (
        <span className="inline-flex rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-xs font-medium capitalize text-foreground">
          {row.original.role}
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: usersTable.statusHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getStatusClassName(row.original.status)
            )}
          >
            {getStatusLabel(row.original.status, messages)}
          </span>
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
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.subscriptionTemplateName || usersTable.noSubscription}
        </span>
      )
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
              {subscriptionsPage.edit}
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
  messages
}: {
  data: AdminUserSubscriptionRow[];
  messages: AdminMessages;
}): BuildTableDefinition<AdminUserSubscriptionRow> {
  const usersTable = messages.usersTable;
  const subscriptionsPage = messages.subscriptionsPage;

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
            </div>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminUserSubscriptionRow>({
        key: 'role',
        header: usersTable.roleHeader,
        cell: (row) => (
          <span className="inline-flex rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-xs font-medium capitalize text-foreground">
            {row.role}
          </span>
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
            <span
              className={cn(
                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                getStatusClassName(row.status)
              )}
            >
              {getStatusLabel(row.status, messages)}
            </span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminUserSubscriptionRow>({
        key: 'subscriptionTemplateName',
        header: usersTable.subscriptionHeader,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.subscriptionTemplateName || usersTable.noSubscription}
          </span>
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
                {subscriptionsPage.edit}
              </Link>
            </Button>
          </AdminTableSlotTemplate>
        )
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: messages.usersPage.filterPlaceholder,
        columns: ['email']
      },
      filters: [
        buildTableFilter.select<AdminUserSubscriptionRow>({
          id: 'status',
          label: usersTable.statusHeader,
          column: 'status',
          placeholder: usersTable.statusHeader,
          options: [
            { value: 'active', label: messages.userDetailPage.status.active },
            { value: 'suspended', label: messages.userDetailPage.status.suspended },
            { value: 'banned', label: messages.userDetailPage.status.banned }
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
