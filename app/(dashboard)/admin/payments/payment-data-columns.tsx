'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeTemplate } from '@/components/ui/theme-template';
import { AdminTableSlotTemplate } from '../table-slot-template';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import type { AdminMessages } from '@/lib/i18n/messages/admin';

type PaymentSource = 'checkout' | 'webhook' | 'dashboard' | 'system';

export type AdminPaymentDataRow = {
  id: number;
  paidAt: number;
  paidAtLabel: string;
  payer: string;
  reason: string;
  provider: string;
  source: PaymentSource;
  paymentType: string;
  amountLabel: string;
  paymentReference: string | null;
  purchaseOrderReference: string | null;
  eventType: string;
  message: string;
};

function normalizeSource(
  source: string,
  fallback: PaymentSource = 'system'
): PaymentSource {
  if (
    source === 'checkout' ||
    source === 'webhook' ||
    source === 'dashboard' ||
    source === 'system'
  ) {
    return source;
  }

  return fallback;
}

type PaymentPreviewDialogProps = {
  row: AdminPaymentDataRow;
  messages: AdminMessages;
};

function PaymentPreviewDialog({
  row,
  messages
}: PaymentPreviewDialogProps) {
  const table = messages.paymentsPage.table;
  const sourceLabels: Record<PaymentSource, string> = {
    checkout: table.checkout,
    webhook: table.webhook,
    dashboard: table.dashboard,
    system: table.system
  };

  const orderLabel = table.orderLabel.replace('{id}', String(row.id));
  const sourceLabel = sourceLabels[normalizeSource(row.source)];

  const fallbackDialog = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          {table.preview}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{table.invoiceTitle}</AlertDialogTitle>
          <AlertDialogDescription>{table.invoiceDescription}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{table.whoHeader}</p>
            <p className="font-medium">{row.payer}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{table.paidAtHeader}</p>
            <p className="font-medium">{row.paidAtLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{table.reasonHeader}</p>
            <p className="font-medium">{row.reason}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{table.amountHeader}</p>
            <p className="font-medium">{row.amountLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{table.originHeader}</p>
            <p className="font-medium">{sourceLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{table.typeHeader}</p>
            <p className="font-medium">{row.paymentType}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">{table.paymentReferenceHeader}</p>
            <p className="break-all font-medium">{row.paymentReference || table.none}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">{table.purchaseOrderHeader}</p>
            <p className="break-all font-medium">
              {orderLabel} - {row.purchaseOrderReference || table.none}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">{table.eventLabel}</p>
            <p className="break-all font-medium">{row.eventType}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">{table.messageLabel}</p>
            <p className="break-words font-medium">{row.message || table.none}</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">{table.closePreview}</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <ThemeTemplate
      id="ui.alert-dialog"
      data={{
        area: 'admin',
        slot: 'admin.payments.preview-dialog'
      }}
      fallback={fallbackDialog}
    >
      {fallbackDialog}
    </ThemeTemplate>
  );
}

export function getPaymentDataColumns(
  messages: AdminMessages
): ColumnDef<AdminPaymentDataRow>[] {
  const table = messages.paymentsPage.table;
  const sourceLabels: Record<PaymentSource, string> = {
    checkout: table.checkout,
    webhook: table.webhook,
    dashboard: table.dashboard,
    system: table.system
  };

  return [
    {
      accessorKey: 'paidAt',
      header: ({ column }) => {
        const fallbackHeader = (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {table.paidAtHeader}
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="header.paid-at.sort"
          >
            {fallbackHeader}
          </AdminTableSlotTemplate>
        );
      },
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.paidAtLabel}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.paid-at"
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'payer',
      header: table.whoHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <p className="min-w-[170px] font-medium text-foreground">
            {row.original.payer}
          </p>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.payer"
            data={{
              paymentId: row.original.id
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'reason',
      header: table.reasonHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="min-w-[220px] text-xs text-muted-foreground">
            {row.original.reason}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.reason"
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'provider',
      header: table.providerHeader
    },
    {
      accessorKey: 'source',
      header: table.originHeader,
      cell: ({ row }) => {
        const source = normalizeSource(row.original.source);
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {sourceLabels[source]}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.source"
            data={{
              source
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'paymentType',
      header: table.typeHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.paymentType}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.payment-type"
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'amountLabel',
      header: table.amountHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="text-xs text-muted-foreground">
            {row.original.amountLabel}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.amount"
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'paymentReference',
      header: table.paymentReferenceHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <span className="block max-w-[230px] truncate text-xs text-muted-foreground">
            {row.original.paymentReference || table.none}
          </span>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.payment-reference"
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      accessorKey: 'purchaseOrderReference',
      header: table.purchaseOrderHeader,
      cell: ({ row }) => {
        const fallbackCell = (
          <div className="min-w-[200px] space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {table.orderLabel.replace('{id}', String(row.original.id))}
            </p>
            <p className="break-all">
              {row.original.purchaseOrderReference || table.none}
            </p>
          </div>
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.purchase-order-reference"
            data={{
              paymentId: row.original.id
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    },
    {
      id: 'actions',
      header: table.actionsHeader,
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const fallbackCell = (
          <PaymentPreviewDialog
            row={row.original}
            messages={messages}
          />
        );

        return (
          <AdminTableSlotTemplate
            templateId="section.admin.table.payments.cell"
            slot="cell.actions.preview"
            data={{
              paymentId: row.original.id
            }}
          >
            {fallbackCell}
          </AdminTableSlotTemplate>
        );
      }
    }
  ];
}

