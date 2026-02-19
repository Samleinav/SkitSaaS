'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getUserSubscriptionsColumns,
  type AdminUserSubscriptionRow
} from './user-subscriptions-columns';
import type { AdminMessages } from '@/lib/i18n/messages/admin';

type AdminUserSubscriptionsDataTableProps = {
  data: AdminUserSubscriptionRow[];
  messages: AdminMessages;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminUserSubscriptionsDataTable({
  data,
  messages,
  tableTemplate
}: AdminUserSubscriptionsDataTableProps) {
  return (
    <DataTable
      columns={getUserSubscriptionsColumns(messages)}
      data={data}
      labels={messages.dataTable}
      template={tableTemplate}
      filterColumn="email"
      filterPlaceholder={messages.usersPage.filterPlaceholder}
      tableClassName="min-w-[860px]"
    />
  );
}
