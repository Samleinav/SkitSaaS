'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getLogTableDefinition,
  type AdminSystemLogRow
} from './log-columns';
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
      definition={getLogTableDefinition({
        data,
        messages
      })}
      labels={messages.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[1650px]"
    />
  );
}
