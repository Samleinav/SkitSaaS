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
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../guards';
import { toTemplateAmountLabel } from '../../form-utils';
import { createAdminEditOrderBuildFormBase } from '../../forms';

export default async function AdminEditOrderPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const t = await getServerTranslator({ area: 'admin' });
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
  const intervalLabels = {
    daily: t('Daily'),
    weekly: t('Weekly'),
    monthly: t('Monthly'),
    quarterly: t('Quarterly'),
    semiannual: t('Semi-annual'),
    yearly: t('Yearly')
  } as const;

  const editOrderForm = composeRegisteredBuildFormDefinition(
    'admin-edit-order-form',
    createAdminEditOrderBuildFormBase({
      copy: {
        providerLabel: t('Provider'),
        statusLabel: t('Order status'),
        eventTypeLabel: t('Event type'),
        teamIdLabel: t('Team (for organization subscription)'),
        teamIdHint: t(
          'Choose the team that receives the organization-scope subscription.'
        ),
        templateIdLabel: t('Subscription template'),
        templateIdHint: t(
          'Required. Templates are filtered by selected target scope.'
        ),
        paymentMethodLabel: t('Payment method'),
        planNameLabel: t('Plan name'),
        amountMajorLabel: t('Amount'),
        amountMajorHint: t('Use decimal format (for example, 10.50).'),
        currencyLabel: t('Currency'),
        messageLabel: t('Message'),
        messagePlaceholder: t('Optional context for event execution'),
        providerPlanIdLabel: t('Provider plan ID'),
        externalPaymentIdLabel: t('External payment ID'),
        externalOrderIdLabel: t('External order ID'),
        statusLabels: {
          pending: t('pending'),
          received: t('received'),
          canceled: t('canceled'),
          failed: t('failed')
        }
      }
    }),
    {
      submit: {
        idleLabel: t('Save order'),
        pendingLabel: t('Saving order...'),
        successLabel: t('Order saved'),
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
        teamOptions: formOptions.teams.map((team) => ({
          value: team.id,
          label: `${team.name} (#${team.id})`
        })),
        templateOptions: formOptions.templates.map((template) => {
          const intervalLabel =
            intervalLabels[
              template.billingInterval as keyof typeof intervalLabels
            ] || template.billingInterval;
          return {
            value: template.id,
            label: `${template.name} (#${template.id}) — ${intervalLabel} — ${toTemplateAmountLabel(template.priceCents, template.currency)}`
          };
        })
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t('Edit Order')}</CardTitle>
          <CardDescription>
            {t(
              'Update order data and trigger related payment/order events after saving.'
            )}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">{t('Back to orders')}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLegacyEvent && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            {t(
              'This record belongs to a template maintenance event. It is not a real checkout order.'
            )}
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
                    {t('Provider plan ID')}
                  </p>
                  <p className="truncate rounded-md border border-border/50 bg-muted/30 px-3 py-2 font-mono text-xs">
                    {order.providerPlanId}
                  </p>
                </div>
              )}
              {order.externalPaymentId && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t('External payment ID')}
                  </p>
                  <p className="truncate rounded-md border border-border/50 bg-muted/30 px-3 py-2 font-mono text-xs">
                    {order.externalPaymentId}
                  </p>
                </div>
              )}
              {order.externalOrderId && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t('External order ID')}
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
        title: t('Edit Order'),
        description: t(
          'Update order data and trigger related payment/order events after saving.'
        ),
        orderId: order.id
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
