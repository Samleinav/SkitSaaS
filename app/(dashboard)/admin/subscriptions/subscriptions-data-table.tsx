'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getColumns,
  type AdminSubscriptionRow,
  type AdminSubscriptionTemplateOption
} from './columns';
import type { AdminMessages } from '@/lib/i18n/messages/admin';

type AdminSubscriptionsDataTableProps = {
  data: AdminSubscriptionRow[];
  templateOptions: AdminSubscriptionTemplateOption[];
  messages: AdminMessages;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminSubscriptionsDataTable({
  data,
  templateOptions,
  messages,
  tableTemplate
}: AdminSubscriptionsDataTableProps) {
  return (
    <DataTable
      columns={getColumns(templateOptions, messages, tableTemplate?.themeId ?? null)}
      data={data}
      labels={messages.dataTable}
      template={tableTemplate}
      filterColumn="name"
      filterPlaceholder={messages.subscriptionsPage.filterPlaceholder}
      tableClassName="min-w-[860px]"
      initialColumnVisibility={{ ids: false }}
    />
  );
}
