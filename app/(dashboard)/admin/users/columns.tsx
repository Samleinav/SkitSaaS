'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import { AdminTableSlotTemplate } from '../table-slot-template';
import {
  getAdminUserStatusClassName,
  type AdminUserDisplayStatus
} from './status';

export type AdminUserRow = {
  id: number;
  name: string | null;
  email: string;
  role: string;
  status: AdminUserDisplayStatus;
  statusReason: string | null;
  organizationsCount: number;
  ownedOrganizationsCount: number;
  subscriptionTemplateName: string | null;
  createdAt: number;
  createdAtLabel: string;
};

function getStatusLabel(
  status: AdminUserDisplayStatus,
  usersTable: AdminMessages['usersTable']
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

export function getColumns(
  messages: AdminMessages,
  themeId: string | null = null
): ColumnDef<AdminUserRow>[] {
  const usersTable = messages.usersTable;

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
            templateId="section.admin.table.users.cell"
            themeId={themeId}
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
            templateId="section.admin.table.users.cell"
            themeId={themeId}
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
        <span className="text-sm capitalize">{row.original.role}</span>
      )
    },
    {
      accessorKey: 'status',
      header: usersTable.statusHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <div className="space-y-1">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getAdminUserStatusClassName(
                row.original.status
              )}`}
            >
              {getStatusLabel(row.original.status, usersTable)}
            </span>
            {row.original.statusReason ? (
              <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                {row.original.statusReason}
              </p>
            ) : null}
          </div>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.users.cell"
            themeId={themeId}
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
        <div className="text-xs text-muted-foreground">
          {usersTable.organizationsCount
            .replace('{count}', String(row.original.organizationsCount))
            .replace('{owned}', String(row.original.ownedOrganizationsCount))}
        </div>
      )
    },
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
            {usersTable.createdHeader}
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.users.cell"
            themeId={themeId}
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
            templateId="section.admin.table.users.cell"
            themeId={themeId}
            slot="cell.created-at"
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      id: 'actions',
      header: usersTable.actionsHeader,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const fallbackCell = (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/users/${row.original.id}`}>{usersTable.manage}</Link>
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.users.cell"
            themeId={themeId}
            slot="cell.actions.manage"
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
