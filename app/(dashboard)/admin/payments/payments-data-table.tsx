'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getPaymentDataColumns,
  type AdminPaymentDataRow
} from './payment-data-columns';
import type { AdminMessages } from '@/lib/i18n/messages/admin';

type AdminPaymentsDataTableProps = {
  data: AdminPaymentDataRow[];
  messages: AdminMessages;
  themeId?: string | null;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminPaymentsDataTable({
  data,
  messages,
  themeId = null,
  tableTemplate
}: AdminPaymentsDataTableProps) {
  return (
    <DataTable
      columns={getPaymentDataColumns(messages, { themeId })}
      data={data}
      labels={messages.dataTable}
      template={tableTemplate}
      filterColumn="payer"
      filterPlaceholder={messages.paymentsPage.filterPlaceholder}
      tableClassName="min-w-[1560px]"
    />
  );
}
