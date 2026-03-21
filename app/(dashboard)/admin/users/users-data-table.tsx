'use client';

import type { ReactNode } from 'react';
import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getUserTableDefinition,
  type AdminUserRow
} from './columns';
import type { AdminUsersCopy } from './i18n';

type AdminUsersDataTableProps = {
  data: AdminUserRow[];
  copy: AdminUsersCopy;
  tableTemplate?: DataTableThemeTemplate;
  toolbarActions?: ReactNode;
};

export function AdminUsersDataTable({
  data,
  copy,
  tableTemplate,
  toolbarActions
}: AdminUsersDataTableProps) {
  return (
    <DataTable
      definition={getUserTableDefinition({
        data,
        copy
      })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[1020px]"
      toolbarActions={toolbarActions}
    />
  );
}
