'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import { getOrderTableDefinition, type AdminOrderRow } from './order-columns';
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
      definition={getOrderTableDefinition({ data, messages })}
      labels={messages.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[1940px]"
    />
  );
}
