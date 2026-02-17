'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import { getLogColumns, type AdminSystemLogRow } from './log-columns';
import type { AdminMessages } from '@/lib/i18n/messages/admin';

type AdminLogsDataTableProps = {
  data: AdminSystemLogRow[];
  messages: AdminMessages;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminLogsDataTable({
  data,
  messages,
  tableTemplate
}: AdminLogsDataTableProps) {
  return (
    <DataTable
      columns={getLogColumns(messages, tableTemplate?.themeId ?? null)}
      data={data}
      labels={messages.dataTable}
      template={tableTemplate}
      filterColumn="eventType"
      filterPlaceholder={messages.logsPage.filterPlaceholder}
      tableClassName="min-w-[1650px]"
    />
  );
}
