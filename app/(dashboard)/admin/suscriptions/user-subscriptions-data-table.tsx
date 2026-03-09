'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getUserSubscriptionsTableDefinition,
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
      definition={getUserSubscriptionsTableDefinition({ data, messages })}
      labels={messages.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[860px]"
    />
  );
}
