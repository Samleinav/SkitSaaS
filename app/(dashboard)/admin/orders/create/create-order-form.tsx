'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemedAsyncSubmitButton } from '@/components/ui/themed-async-submit-button';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import {
  ADMIN_MANUAL_ORDER_EVENT_TYPE,
  ORDER_PROVIDERS,
  ORDER_STATUSES,
  toTemplateAmountLabel
} from '../form-utils';
import { createPaymentOrderAction } from '../../actions';

type OrderTargetType = 'team' | 'user';

type CreateOrderFormOptionData = {
  teams: Array<{
    id: number;
    name: string;
  }>;
  users: Array<{
    id: number;
    name: string | null;
    email: string;
  }>;
  templates: Array<{
    id: number;
    name: string;
    targetScope: string;
    billingInterval: string;
    priceCents: number;
    currency: string;
  }>;
};

type AdminCreateOrderFormProps = {
  formOptions: CreateOrderFormOptionData;
  messages: AdminMessages;
  initialTargetType: OrderTargetType;
};

export function AdminCreateOrderForm({
  formOptions,
  messages,
  initialTargetType
}: AdminCreateOrderFormProps) {
  const ordersPage = messages.ordersPage;
  const [targetType, setTargetType] = useState<OrderTargetType>(initialTargetType);

  const statusLabelMap = {
    pending: ordersPage.table.pending,
    received: ordersPage.table.received,
    canceled: ordersPage.table.canceled,
    failed: ordersPage.table.failed
  } as const;

  const visibleTemplates = useMemo(() => {
    const expectedScope = targetType === 'user' ? 'user' : 'organization';

    return formOptions.templates.filter(
      (template) => template.targetScope === expectedScope
    );
  }, [formOptions.templates, targetType]);

  return (
    <form action={createPaymentOrderAction} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="order-target-type">{ordersPage.form.targetTypeLabel}</Label>
        <select
          id="order-target-type"
          name="targetType"
          value={targetType}
          onChange={(event) =>
            setTargetType(event.target.value as OrderTargetType)
          }
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm md:max-w-sm"
        >
          <option value="team">{ordersPage.form.targetTypes.team}</option>
          <option value="user">{ordersPage.form.targetTypes.user}</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-provider">{ordersPage.form.providerLabel}</Label>
        <select
          id="order-provider"
          name="provider"
          defaultValue="stripe"
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
          defaultValue="pending"
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
        {`${ordersPage.form.eventTypeLabel}: ${ADMIN_MANUAL_ORDER_EVENT_TYPE}`}
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-user-id">{ordersPage.form.userIdLabel}</Label>
        <select
          id="order-user-id"
          name="userId"
          defaultValue=""
          disabled={targetType !== 'user'}
          required={targetType === 'user'}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="">{ordersPage.table.none}</option>
          {formOptions.users.map((user) => (
            <option key={user.id} value={user.id}>
              {`${user.email} (#${user.id}) - ${user.name || messages.usersTable.unnamedUser}`}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{ordersPage.form.userIdHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-team-id">{ordersPage.form.teamIdLabel}</Label>
        <select
          id="order-team-id"
          name="teamId"
          defaultValue=""
          disabled={targetType !== 'team'}
          required={targetType === 'team'}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="">{ordersPage.table.none}</option>
          {formOptions.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {`${team.name} (#${team.id})`}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{ordersPage.form.teamIdHint}</p>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="order-template-id">{ordersPage.form.templateIdLabel}</Label>
        <select
          id="order-template-id"
          name="subscriptionTemplateId"
          defaultValue=""
          required
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{ordersPage.table.none}</option>
          {visibleTemplates.map((template) => {
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
        <Input id="order-payment-method" name="paymentMethod" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-plan-name">{ordersPage.form.planNameLabel}</Label>
        <Input id="order-plan-name" name="planName" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-provider-plan-id">
          {ordersPage.form.providerPlanIdLabel}
        </Label>
        <Input id="order-provider-plan-id" name="providerPlanId" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-amount-major">{ordersPage.form.amountMajorLabel}</Label>
        <Input
          id="order-amount-major"
          name="amountMajor"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
        />
        <p className="text-xs text-muted-foreground">
          {ordersPage.form.amountMajorHint}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-currency">{ordersPage.form.currencyLabel}</Label>
        <Input id="order-currency" name="currency" defaultValue="USD" />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="order-message">{ordersPage.form.messageLabel}</Label>
        <textarea
          id="order-message"
          name="message"
          placeholder={ordersPage.form.messagePlaceholder}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-external-payment-id">
          {ordersPage.form.externalPaymentIdLabel}
        </Label>
        <Input id="order-external-payment-id" name="externalPaymentId" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-external-order-id">
          {ordersPage.form.externalOrderIdLabel}
        </Label>
        <Input id="order-external-order-id" name="externalOrderId" />
      </div>

      <div className="md:col-span-2">
        <ThemedAsyncSubmitButton
          idleLabel={ordersPage.createOrder}
          pendingLabel={ordersPage.creatingOrder}
          successLabel={ordersPage.createdOrder}
          area="admin"
          slot="admin.orders.create.submit"
        />
      </div>
    </form>
  );
}
