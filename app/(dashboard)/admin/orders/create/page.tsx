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
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../guards';
import {
  ADMIN_MANUAL_ORDER_EVENT_TYPE,
  toTemplateAmountLabel
} from '../form-utils';
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
  const t = await getServerTranslator({ area: 'admin' });
  await requireAdminAccess();
  const resolvedSearchParams = await searchParams;
  const initialTargetType = resolveInitialTargetType(
    resolvedSearchParams.targetType
  );

  const formOptions = await getPaymentOrderFormOptionsForAdmin();
  const themeSelection = await getThemeSelectionForArea('admin');

  const intervalLabels = {
    daily: t('Daily'),
    weekly: t('Weekly'),
    monthly: t('Monthly'),
    quarterly: t('Quarterly'),
    semiannual: t('Semi-annual'),
    yearly: t('Yearly')
  } as const;

  const createOrderForm = composeRegisteredBuildFormDefinition(
    'admin-create-order-form',
    createAdminCreateOrderBuildFormBase({
      copy: {
        targetTypeLabel: t('Subscription target'),
        targetTypes: {
          team: t('Organization / Team'),
          user: t('User')
        },
        providerLabel: t('Provider'),
        statusLabel: t('Order status'),
        eventTypeLabel: t('Event type'),
        userIdLabel: t('User (for user subscription)'),
        userIdHint: t(
          'Choose the user who receives the user-scope subscription.'
        ),
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
        idleLabel: t('Create order'),
        pendingLabel: t('Creating order...'),
        successLabel: t('Order created'),
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
        teamOptions: formOptions.teams.map((team) => ({
          value: team.id,
          label: `${team.name} (#${team.id})`
        })),
        templateOptions: formOptions.templates.map((template) => {
          const intervalLabel =
            intervalLabels[
              template.billingInterval as keyof typeof intervalLabels
            ] || template.billingInterval;
          const scopeLabel = template.targetScope === 'user' ? '[User]' : '[Org]';
          return {
            value: template.id,
            label: `${scopeLabel} ${template.name} (${intervalLabel} — ${toTemplateAmountLabel(template.priceCents, template.currency)})`
          };
        })
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t('Create Manual Subscription Order')}</CardTitle>
          <CardDescription>
            {t(
              'Create a manual subscription purchase order for a user or organization and trigger lifecycle events when status applies.'
            )}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">{t('Back to orders')}</Link>
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
        title: t('Create Manual Subscription Order'),
        description: t(
          'Create a manual subscription purchase order for a user or organization and trigger lifecycle events when status applies.'
        ),
        initialTargetType
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
