'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getSubscriptionsTableDefinition,
  type AdminSubscriptionRow
} from './columns';
import type { AdminSubscriptionsCopy } from './i18n';

type AdminSubscriptionsDataTableProps = {
  data: AdminSubscriptionRow[];
  copy: AdminSubscriptionsCopy;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminSubscriptionsDataTable({
  data,
  copy,
  tableTemplate
}: AdminSubscriptionsDataTableProps) {
  return (
    <DataTable
      definition={getSubscriptionsTableDefinition({ data, copy })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[860px]"
    />
  );
}
