'use client';

import Link from 'next/link';
import {
  buildTableColumn,
  buildTableFilter,
  defineBuildTable,
  type BuildTableDefinition
} from '@skitsaas/sdk/datatables';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import { cn } from '@/lib/utils';

export type AdminCommerceProductRow = {
  id: number;
  productKey: string;
  name: string;
  kind: 'subscription' | 'one_time';
  kindLabel: string;
  priceLabel: string;
  state: 'published' | 'draft';
  stateLabel: string;
  updatedAt: number;
  updatedAtLabel: string;
  editPath: string;
  isPublished: boolean;
};

type AdminCommerceProductsTableMessages = {
  idHeader: string;
  keyHeader: string;
  nameHeader: string;
  kindHeader: string;
  priceHeader: string;
  stateHeader: string;
  updatedHeader: string;
  actionsHeader: string;
  editLabel: string;
  publishLabel: string;
  unpublishLabel: string;
};

type ProductAdminAction = (formData: FormData) => Promise<void> | void;

type CommerceProductsAdminDataTableProps = {
  data: AdminCommerceProductRow[];
  filterPlaceholder: string;
  emptyMessage: string;
  tableMessages: AdminCommerceProductsTableMessages;
  returnTo: string;
  publishAction: ProductAdminAction;
  unpublishAction: ProductAdminAction;
  tableTemplate?: DataTableThemeTemplate;
};

function getStateClassName(state: 'published' | 'draft') {
  if (state === 'published') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  return 'border-border bg-muted text-muted-foreground';
}

function getKindClassName(kind: 'subscription' | 'one_time') {
  if (kind === 'subscription') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300';
  }

  return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
}

function getProductTableDefinition({
  data,
  filterPlaceholder,
  tableMessages,
  returnTo,
  publishAction,
  unpublishAction
}: {
  data: AdminCommerceProductRow[];
  filterPlaceholder: string;
  tableMessages: AdminCommerceProductsTableMessages;
  returnTo: string;
  publishAction: ProductAdminAction;
  unpublishAction: ProductAdminAction;
}): BuildTableDefinition<AdminCommerceProductRow> {
  const definition: BuildTableDefinition<AdminCommerceProductRow> = {
    data,
    columns: [
      buildTableColumn.text<AdminCommerceProductRow>({
        key: 'id',
        header: tableMessages.idHeader,
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-xs text-muted-foreground">{row.id}</span>
        )
      }),
      buildTableColumn.text<AdminCommerceProductRow>({
        key: 'productKey',
        header: tableMessages.keyHeader,
        cell: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.productKey}
          </span>
        )
      }),
      buildTableColumn.text<AdminCommerceProductRow>({
        key: 'name',
        header: tableMessages.nameHeader,
        sortable: true,
        searchable: true,
        cell: (row) => (
          <div className="min-w-[180px]">
            <p className="font-medium text-foreground">{row.name}</p>
          </div>
        )
      }),
      buildTableColumn.text<AdminCommerceProductRow>({
        key: 'kind',
        header: tableMessages.kindHeader,
        cell: (row) => (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getKindClassName(row.kind)
            )}
          >
            {row.kindLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminCommerceProductRow>({
        key: 'priceLabel',
        header: tableMessages.priceHeader,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{row.priceLabel}</span>
        )
      }),
      buildTableColumn.text<AdminCommerceProductRow>({
        key: 'state',
        header: tableMessages.stateHeader,
        cell: (row) => (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getStateClassName(row.state)
            )}
          >
            {row.stateLabel}
          </span>
        )
      }),
      buildTableColumn.text<AdminCommerceProductRow>({
        key: 'updatedAt',
        header: tableMessages.updatedHeader,
        sortable: true,
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{row.updatedAtLabel}</span>
        )
      }),
      buildTableColumn.custom<AdminCommerceProductRow>({
        key: 'actions',
        header: tableMessages.actionsHeader,
        cell: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={row.editPath}>{tableMessages.editLabel}</Link>
            </Button>
            <form action={row.isPublished ? unpublishAction : publishAction}>
              <input type="hidden" name="productId" value={row.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Button type="submit" size="sm" variant="outline">
                {row.isPublished
                  ? tableMessages.unpublishLabel
                  : tableMessages.publishLabel}
              </Button>
            </form>
          </div>
        )
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: filterPlaceholder,
        columns: ['name', 'productKey']
      },
      filters: [
        buildTableFilter.select<AdminCommerceProductRow>({
          id: 'state',
          label: tableMessages.stateHeader,
          column: 'state',
          placeholder: tableMessages.stateHeader,
          options: [
            { value: 'published', label: tableMessages.publishLabel },
            { value: 'draft', label: tableMessages.unpublishLabel }
          ]
        }),
        buildTableFilter.select<AdminCommerceProductRow>({
          id: 'kind',
          label: tableMessages.kindHeader,
          column: 'kind',
          placeholder: tableMessages.kindHeader,
          options: [
            { value: 'subscription', label: 'Subscription' },
            { value: 'one_time', label: 'One-time' }
          ]
        })
      ]
    },
    pagination: {
      pageSize: 10
    }
  };

  return defineBuildTable<
    AdminCommerceProductRow,
    BuildTableDefinition<AdminCommerceProductRow>
  >(definition);
}

export function CommerceProductsAdminDataTable({
  data,
  filterPlaceholder,
  emptyMessage,
  tableMessages,
  returnTo,
  publishAction,
  unpublishAction,
  tableTemplate
}: CommerceProductsAdminDataTableProps) {
  return (
    <DataTable
      definition={getProductTableDefinition({
        data,
        filterPlaceholder,
        tableMessages,
        returnTo,
        publishAction,
        unpublishAction
      })}
      template={tableTemplate}
      emptyMessage={emptyMessage}
      tableClassName="min-w-[1220px]"
    />
  );
}
