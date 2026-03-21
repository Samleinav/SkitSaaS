'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getUserSubscriptionsTableDefinition,
  type AdminUserSubscriptionRow
} from './user-subscriptions-columns';
import type { AdminSubscriptionsCopy } from '../subscriptions/i18n';

type AdminUserSubscriptionsDataTableProps = {
  data: AdminUserSubscriptionRow[];
  copy: AdminSubscriptionsCopy;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminUserSubscriptionsDataTable({
  data,
  copy,
  tableTemplate
}: AdminUserSubscriptionsDataTableProps) {
  return (
    <DataTable
      definition={getUserSubscriptionsTableDefinition({ data, copy })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[860px]"
    />
  );
}
