import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getPaymentOrderFormOptionsForAdmin } from '@/lib/db/queries.admin';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../guards';
import { ADMIN_MANUAL_ORDER_EVENT_TYPE, toTemplateAmountLabel } from '../form-utils';
import { createAdminCreateOrderBuildFormBase } from '../forms';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveInitialTargetType(
  value: string | string[] | undefined
): 'team' | 'user' {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'user' ? 'user' : 'team';
}

export default async function AdminCreateOrderPage({ searchParams }: PageProps) {
  const messages = await getServerMessages('admin');
  const ordersPage = messages.ordersPage;
  await requireAdminAccess();
  const resolvedSearchParams = await searchParams;
  const initialTargetType = resolveInitialTargetType(
    resolvedSearchParams.targetType
  );

  const formOptions = await getPaymentOrderFormOptionsForAdmin();
  const themeSelection = await getThemeSelectionForArea('admin');

  const intervalLabels = messages.templateForm.intervals;

  const createOrderForm = composeRegisteredBuildFormDefinition(
    'admin-create-order-form',
    createAdminCreateOrderBuildFormBase({
      copy: {
        targetTypeLabel: ordersPage.form.targetTypeLabel,
        targetTypes: ordersPage.form.targetTypes,
        providerLabel: ordersPage.form.providerLabel,
        statusLabel: ordersPage.form.statusLabel,
        eventTypeLabel: ordersPage.form.eventTypeLabel,
        userIdLabel: ordersPage.form.userIdLabel,
        userIdHint: ordersPage.form.userIdHint,
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
        idleLabel: ordersPage.createOrder,
        pendingLabel: ordersPage.creatingOrder,
        successLabel: ordersPage.createdOrder,
        align: 'start'
      },
      values: {
        targetType: initialTargetType,
        status: 'pending',
        provider: 'system',
        currency: 'USD',
        eventType: ADMIN_MANUAL_ORDER_EVENT_TYPE
      },
      dynamicOptions: {
        userOptions: formOptions.users.map((u) => ({
          value: u.id,
          label: `${u.email} (#${u.id})${u.name ? ` — ${u.name}` : ''}`
        })),
        teamOptions: formOptions.teams.map((t) => ({
          value: t.id,
          label: `${t.name} (#${t.id})`
        })),
        templateOptions: formOptions.templates.map((t) => {
          const intervalLabel =
            intervalLabels[t.billingInterval as keyof typeof intervalLabels] ||
            t.billingInterval;
          const scopeLabel = t.targetScope === 'user' ? '[User]' : '[Org]';
          return {
            value: t.id,
            label: `${scopeLabel} ${t.name} (${intervalLabel} — ${toTemplateAmountLabel(t.priceCents, t.currency)})`
          };
        })
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{ordersPage.createTitle}</CardTitle>
          <CardDescription>{ordersPage.createDescription}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">{ordersPage.backToOrders}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <TemplateBuildForm
          definition={createOrderForm}
          area="admin"
          route="/admin/orders/create"
          slot="admin.orders.create"
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
      id="page.admin.orders.create"
      data={{
        title: ordersPage.createTitle,
        description: ordersPage.createDescription,
        initialTargetType
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
