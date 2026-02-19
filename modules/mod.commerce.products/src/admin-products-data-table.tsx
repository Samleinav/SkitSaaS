'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';

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

type AdminCommerceProductsFilterMessages = {
  kindLabel: string;
  publicationLabel: string;
  allLabel: string;
  subscriptionLabel: string;
  oneTimeLabel: string;
  publishedLabel: string;
  draftLabel: string;
};

type ProductAdminAction = (formData: FormData) => Promise<void> | void;

type CommerceProductsAdminDataTableProps = {
  data: AdminCommerceProductRow[];
  filterPlaceholder: string;
  emptyMessage: string;
  tableMessages: AdminCommerceProductsTableMessages;
  filterMessages: AdminCommerceProductsFilterMessages;
  returnTo: string;
  publishAction: ProductAdminAction;
  unpublishAction: ProductAdminAction;
  tableTemplate?: DataTableThemeTemplate;
};

function getColumns({
  tableMessages,
  returnTo,
  publishAction,
  unpublishAction
}: {
  tableMessages: AdminCommerceProductsTableMessages;
  returnTo: string;
  publishAction: ProductAdminAction;
  unpublishAction: ProductAdminAction;
}): ColumnDef<AdminCommerceProductRow>[] {
  return [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {tableMessages.idHeader}
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.id}</span>
      )
    },
    {
      accessorKey: 'productKey',
      header: tableMessages.keyHeader,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.productKey}</span>
      )
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {tableMessages.nameHeader}
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.name}</span>
    },
    {
      accessorKey: 'kind',
      header: tableMessages.kindHeader,
      cell: ({ row }) => <span>{row.original.kindLabel}</span>
    },
    {
      accessorKey: 'priceLabel',
      header: tableMessages.priceHeader
    },
    {
      accessorKey: 'state',
      header: tableMessages.stateHeader,
      cell: ({ row }) => <span>{row.original.stateLabel}</span>
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {tableMessages.updatedHeader}
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.updatedAtLabel}
        </span>
      )
    },
    {
      id: 'actions',
      header: tableMessages.actionsHeader,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={row.original.editPath}
            className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs"
          >
            {tableMessages.editLabel}
          </Link>
          <form action={row.original.isPublished ? unpublishAction : publishAction}>
            <input type="hidden" name="productId" value={row.original.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs"
            >
              {row.original.isPublished
                ? tableMessages.unpublishLabel
                : tableMessages.publishLabel}
            </button>
          </form>
        </div>
      )
    }
  ];
}

export function CommerceProductsAdminDataTable({
  data,
  filterPlaceholder,
  emptyMessage,
  tableMessages,
  filterMessages,
  returnTo,
  publishAction,
  unpublishAction,
  tableTemplate
}: CommerceProductsAdminDataTableProps) {
  const [kindFilter, setKindFilter] = React.useState<
    'all' | 'subscription' | 'one_time'
  >('all');
  const [publicationFilter, setPublicationFilter] = React.useState<
    'all' | 'published' | 'draft'
  >('all');

  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      if (kindFilter !== 'all' && row.kind !== kindFilter) {
        return false;
      }

      if (publicationFilter !== 'all' && row.state !== publicationFilter) {
        return false;
      }

      return true;
    });
  }, [data, kindFilter, publicationFilter]);

  const toolbarActions = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{filterMessages.kindLabel}</span>
        <select
          value={kindFilter}
          onChange={(event) =>
            setKindFilter(event.target.value as 'all' | 'subscription' | 'one_time')
          }
          className="h-8 rounded-md border border-zinc-300 bg-transparent px-2 text-xs text-foreground"
        >
          <option value="all">{filterMessages.allLabel}</option>
          <option value="subscription">{filterMessages.subscriptionLabel}</option>
          <option value="one_time">{filterMessages.oneTimeLabel}</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{filterMessages.publicationLabel}</span>
        <select
          value={publicationFilter}
          onChange={(event) =>
            setPublicationFilter(event.target.value as 'all' | 'published' | 'draft')
          }
          className="h-8 rounded-md border border-zinc-300 bg-transparent px-2 text-xs text-foreground"
        >
          <option value="all">{filterMessages.allLabel}</option>
          <option value="published">{filterMessages.publishedLabel}</option>
          <option value="draft">{filterMessages.draftLabel}</option>
        </select>
      </label>
    </div>
  );

  return (
    <DataTable
      columns={getColumns({
        tableMessages,
        returnTo,
        publishAction,
        unpublishAction
      })}
      data={filteredData}
      template={tableTemplate}
      filterColumn="name"
      filterPlaceholder={filterPlaceholder}
      emptyMessage={emptyMessage}
      tableClassName="min-w-[1220px]"
      toolbarActions={toolbarActions}
    />
  );
}
