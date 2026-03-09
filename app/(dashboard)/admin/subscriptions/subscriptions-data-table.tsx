'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getSubscriptionsTableDefinition,
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
  messages,
  tableTemplate
}: AdminSubscriptionsDataTableProps) {
  return (
    <DataTable
      definition={getSubscriptionsTableDefinition({ data, messages })}
      labels={messages.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[860px]"
    />
  );
}
