'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import { getOrderColumns, type AdminOrderRow } from './order-columns';
import type { AdminMessages } from '@/lib/i18n/messages/admin';

type AdminOrdersDataTableProps = {
  data: AdminOrderRow[];
  messages: AdminMessages;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminOrdersDataTable({
  data,
  messages,
  tableTemplate
}: AdminOrdersDataTableProps) {
  return (
    <DataTable
      columns={getOrderColumns(messages, tableTemplate?.themeId ?? null)}
      data={data}
      labels={messages.dataTable}
      template={tableTemplate}
      filterColumn="teamName"
      filterPlaceholder={messages.ordersPage.filterPlaceholder}
      tableClassName="min-w-[1940px]"
    />
  );
}
