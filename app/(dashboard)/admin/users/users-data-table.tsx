'use client';

import type { ReactNode } from 'react';
import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import { getColumns, type AdminUserRow } from './columns';
import type { AdminMessages } from '@/lib/i18n/messages/admin';

type AdminUsersDataTableProps = {
  data: AdminUserRow[];
  messages: AdminMessages;
  tableTemplate?: DataTableThemeTemplate;
  toolbarActions?: ReactNode;
};

export function AdminUsersDataTable({
  data,
  messages,
  tableTemplate,
  toolbarActions
}: AdminUsersDataTableProps) {
  return (
    <DataTable
      columns={getColumns(messages, tableTemplate?.themeId ?? null)}
      data={data}
      labels={messages.dataTable}
      template={tableTemplate}
      filterColumn="email"
      filterPlaceholder={messages.usersPage.filterPlaceholder}
      tableClassName="min-w-[1020px]"
      toolbarActions={toolbarActions}
    />
  );
}
