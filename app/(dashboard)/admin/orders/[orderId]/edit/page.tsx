import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { Button } from '@/components/ui/button';
import {
  getPaymentOrderForAdminById,
  getPaymentOrderFormOptionsForAdmin
} from '@/lib/db/queries';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { updatePaymentOrderAction } from '../../actions';
import { requireAdminAccess } from '../../../guards';
import {
  ORDER_PROVIDERS,
  ORDER_STATUSES,
  toTemplateAmountLabel
} from '../../form-utils';

function toMajorAmount(amountInCents: number | null) {
  if (amountInCents === null) {
    return '';
  }

  return (amountInCents / 100).toFixed(2);
}

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

  const amountMajorDefault = toMajorAmount(order.amount);
  const isTemplateMaintenanceEvent = order.eventType.startsWith(
    'subscription.template.'
  );

  const statusLabelMap = {
    pending: ordersPage.table.pending,
    received: ordersPage.table.received,
    canceled: ordersPage.table.canceled,
    failed: ordersPage.table.failed
  } as const;
  const themeSelection = await getThemeSelectionForArea('admin');

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
      <CardContent>
        <form action={updatePaymentOrderAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="orderId" value={order.id} />

          {isTemplateMaintenanceEvent ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 md:col-span-2">
              {ordersPage.legacySystemEventWarning}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="order-provider">{ordersPage.form.providerLabel}</Label>
            <select
              id="order-provider"
              name="provider"
              defaultValue={order.provider}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ORDER_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-status">{ordersPage.form.statusLabel}</Label>
            <select
              id="order-status"
              name="status"
              defaultValue={order.status}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabelMap[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground md:col-span-2">
            {`${ordersPage.form.eventTypeLabel}: ${order.eventType}`}
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-team-id">{ordersPage.form.teamIdLabel}</Label>
            <select
              id="order-team-id"
              name="teamId"
              defaultValue={order.teamId ? String(order.teamId) : ''}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{ordersPage.table.none}</option>
              {formOptions.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {`${team.name} (#${team.id})`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {ordersPage.form.teamIdHint}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-template-id">
              {ordersPage.form.templateIdLabel}
            </Label>
            <select
              id="order-template-id"
              name="subscriptionTemplateId"
              defaultValue={
                order.subscriptionTemplateId
                  ? String(order.subscriptionTemplateId)
                  : ''
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{ordersPage.table.none}</option>
              {formOptions.templates.map((template) => {
                const intervalLabel =
                  messages.templateForm.intervals[
                    template.billingInterval as keyof typeof messages.templateForm.intervals
                  ] || template.billingInterval;

                return (
                  <option key={template.id} value={template.id}>
                    {`${template.name} (#${template.id}) - ${intervalLabel} - ${toTemplateAmountLabel(template.priceCents, template.currency)}`}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-muted-foreground">
              {ordersPage.form.templateIdHint}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-payment-method">
              {ordersPage.form.paymentMethodLabel}
            </Label>
            <Input
              id="order-payment-method"
              name="paymentMethod"
              defaultValue={order.paymentMethod || ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-plan-name">{ordersPage.form.planNameLabel}</Label>
            <Input
              id="order-plan-name"
              name="planName"
              defaultValue={order.planName || ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-provider-plan-id">
              {ordersPage.form.providerPlanIdLabel}
            </Label>
            <Input
              id="order-provider-plan-id"
              name="providerPlanId"
              defaultValue={order.providerPlanId || ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-amount-major">
              {ordersPage.form.amountMajorLabel}
            </Label>
            <Input
              id="order-amount-major"
              name="amountMajor"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              defaultValue={amountMajorDefault}
            />
            <p className="text-xs text-muted-foreground">
              {ordersPage.form.amountMajorHint}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-currency">{ordersPage.form.currencyLabel}</Label>
            <Input
              id="order-currency"
              name="currency"
              defaultValue={order.currency || ''}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="order-message">{ordersPage.form.messageLabel}</Label>
            <textarea
              id="order-message"
              name="message"
              defaultValue={order.message || ''}
              placeholder={ordersPage.form.messagePlaceholder}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-external-payment-id">
              {ordersPage.form.externalPaymentIdLabel}
            </Label>
            <Input
              id="order-external-payment-id"
              name="externalPaymentId"
              defaultValue={order.externalPaymentId || ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-external-order-id">
              {ordersPage.form.externalOrderIdLabel}
            </Label>
            <Input
              id="order-external-order-id"
              name="externalOrderId"
              defaultValue={order.externalOrderId || ''}
            />
          </div>

          <div className="md:col-span-2">
            <TemplateAsyncSubmitButton
              area="admin"
              route={`/admin/orders/${order.id}/edit`}
              idleLabel={ordersPage.saveOrder}
              pendingLabel={ordersPage.savingOrder}
              successLabel={ordersPage.savedOrder}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.admin.orders.edit"
      themeId={themeSelection.themeKey}
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
