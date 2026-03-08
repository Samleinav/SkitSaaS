'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getPaymentTableDefinition,
  type AdminPaymentDataRow
} from './payment-data-columns';
import type { AdminMessages } from '@/lib/i18n/messages/admin';

type AdminPaymentsDataTableProps = {
  data: AdminPaymentDataRow[];
  messages: AdminMessages;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminPaymentsDataTable({
  data,
  messages,
  tableTemplate
}: AdminPaymentsDataTableProps) {
  return (
    <DataTable
      definition={getPaymentTableDefinition({
        data,
        messages
      })}
      labels={messages.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[1560px]"
    />
  );
}
