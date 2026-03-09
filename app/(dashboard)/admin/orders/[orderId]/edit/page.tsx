import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { Button } from '@/components/ui/button';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import {
  getPaymentOrderForAdminById,
  getPaymentOrderFormOptionsForAdmin
} from '@/lib/db/queries.admin';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../guards';
import { toTemplateAmountLabel } from '../../form-utils';
import { createAdminEditOrderBuildFormBase } from '../../forms';

export default async function AdminEditOrderPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const messages = await getServerMessages('admin');
  const ordersPage = messages.ordersPage;
  await requireAdminAccess();

  const { orderId } = await params;
  const parsedOrderId = Number(orderId);
  if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
    notFound();
  }

  const [order, formOptions] = await Promise.all([
    getPaymentOrderForAdminById(parsedOrderId),
    getPaymentOrderFormOptionsForAdmin()
  ]);

  if (!order) {
    notFound();
  }

  const isLegacyEvent = order.eventType.startsWith('subscription.template.');
  const themeSelection = await getThemeSelectionForArea('admin');
  const intervalLabels = messages.templateForm.intervals;

  const editOrderForm = composeRegisteredBuildFormDefinition(
    'admin-edit-order-form',
    createAdminEditOrderBuildFormBase({
      copy: {
        providerLabel: ordersPage.form.providerLabel,
        statusLabel: ordersPage.form.statusLabel,
        eventTypeLabel: ordersPage.form.eventTypeLabel,
        teamIdLabel: ordersPage.form.teamIdLabel,
        teamIdHint: ordersPage.form.teamIdHint,
        templateIdLabel: ordersPage.form.templateIdLabel,
        templateIdHint: ordersPage.form.templateIdHint,
        paymentMethodLabel: ordersPage.form.paymentMethodLabel,
        planNameLabel: ordersPage.form.planNameLabel,
        amountMajorLabel: ordersPage.form.amountMajorLabel,
        amountMajorHint: ordersPage.form.amountMajorHint,
        currencyLabel: ordersPage.form.currencyLabel,
        messageLabel: ordersPage.form.messageLabel,
        messagePlaceholder: ordersPage.form.messagePlaceholder,
        providerPlanIdLabel: ordersPage.form.providerPlanIdLabel,
        externalPaymentIdLabel: ordersPage.form.externalPaymentIdLabel,
        externalOrderIdLabel: ordersPage.form.externalOrderIdLabel,
        statusLabels: {
          pending: ordersPage.table.pending,
          received: ordersPage.table.received,
          canceled: ordersPage.table.canceled,
          failed: ordersPage.table.failed
        }
      }
    }),
    {
      submit: {
        idleLabel: ordersPage.saveOrder,
        pendingLabel: ordersPage.savingOrder,
        successLabel: ordersPage.savedOrder,
        align: 'start'
      },
      values: {
        orderId: order.id,
        status: order.status,
        provider: order.provider,
        paymentMethod: order.paymentMethod ?? '',
        planName: order.planName ?? '',
        message: order.message ?? '',
        teamId: order.teamId ?? null,
        subscriptionTemplateId: order.subscriptionTemplateId ?? null,
        amountMajor:
          order.amount !== null ? String((order.amount / 100).toFixed(2)) : '',
        currency: order.currency ?? '',
        providerPlanId: order.providerPlanId ?? '',
        externalPaymentId: order.externalPaymentId ?? '',
        externalOrderId: order.externalOrderId ?? ''
      },
      dynamicOptions: {
        teamOptions: formOptions.teams.map((t) => ({
          value: t.id,
          label: `${t.name} (#${t.id})`
        })),
        templateOptions: formOptions.templates.map((t) => {
          const intervalLabel =
            intervalLabels[t.billingInterval as keyof typeof intervalLabels] ||
            t.billingInterval;
          return {
            value: t.id,
            label: `${t.name} (#${t.id}) — ${intervalLabel} — ${toTemplateAmountLabel(t.priceCents, t.currency)}`
          };
        })
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{ordersPage.editTitle}</CardTitle>
          <CardDescription>{ordersPage.editDescription}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">{ordersPage.backToOrders}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLegacyEvent && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            {ordersPage.legacySystemEventWarning}
          </div>
        )}
        {(order.providerPlanId ||
          order.externalPaymentId ||
          order.externalOrderId) && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Provider References
            </p>
            <p className="text-xs text-muted-foreground">
              Managed by the payment provider — read only.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {order.providerPlanId && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {ordersPage.form.providerPlanIdLabel}
                  </p>
                  <p className="truncate rounded-md border border-border/50 bg-muted/30 px-3 py-2 font-mono text-xs">
                    {order.providerPlanId}
                  </p>
                </div>
              )}
              {order.externalPaymentId && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {ordersPage.form.externalPaymentIdLabel}
                  </p>
                  <p className="truncate rounded-md border border-border/50 bg-muted/30 px-3 py-2 font-mono text-xs">
                    {order.externalPaymentId}
                  </p>
                </div>
              )}
              {order.externalOrderId && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {ordersPage.form.externalOrderIdLabel}
                  </p>
                  <p className="truncate rounded-md border border-border/50 bg-muted/30 px-3 py-2 font-mono text-xs">
                    {order.externalOrderId}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <TemplateBuildForm
          definition={editOrderForm}
          area="admin"
          route={`/admin/orders/${order.id}/edit`}
          slot="admin.orders.edit"
        />
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.orders.edit"
      data={{
        title: ordersPage.editTitle,
        description: ordersPage.editDescription,
        orderId: order.id
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
