import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { checkoutWithPaymentMethodAction } from '@/lib/payments/actions';
import {
  getSubscriptionTemplateWithFeaturesById,
  getUser
} from '@/lib/db/queries';
import {
  getCheckoutOrderByTokenForUser,
  isCheckoutOrderPayable,
  listCheckoutOrderLineItems,
  markCheckoutOrderCanceled
} from '@/lib/payments/checkout-orders';
import { getServerLocaleAndMessages } from '@/lib/i18n/server';
import { isStripeConfigured } from '@/lib/payments/stripe';
import {
  getPayPalClientId,
  getPayPalCurrency,
  isPayPalConfigured
} from '@/lib/payments/paypal';
import { PaymentMethodSelector } from '../../pricing/payment-method-selector';
import { SubmitButton } from '../../pricing/submit-button';
import { PayPalCheckoutButton } from './paypal-checkout-button';
import {
  getCheckoutPaymentMethodRegistry,
  supportsCheckoutPaymentMethodOrderType
} from '@/lib/payments/payment-methods';

function interpolate(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  );
}

function formatMoney(amountInCents: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInCents / 100);
  } catch {
    return `${currency} ${(amountInCents / 100).toFixed(2)}`;
  }
}

function formatDateLabel(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(value);
}

function resolvePlanRelationLabel({
  relation,
  pricing
}: {
  relation: unknown;
  pricing: {
    currentPlanLabel: string;
    upgradePlanLabel: string;
    downgradePlanLabel: string;
    lateralPlanLabel: string;
  };
}) {
  if (relation === 'same_template') {
    return pricing.currentPlanLabel;
  }

  if (relation === 'upgrade') {
    return pricing.upgradePlanLabel;
  }

  if (relation === 'downgrade') {
    return pricing.downgradePlanLabel;
  }

  if (relation === 'lateral_change') {
    return pricing.lateralPlanLabel;
  }

  return null;
}

type OneTimeSummaryLineItem = {
  key: string;
  name: string;
  description: string | null;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  currency: string;
};

export default async function CheckoutPage({
  params,
  searchParams
}: {
  params: Promise<{ checkoutToken: string }>;
  searchParams?: Promise<{ status?: string | string[]; provider?: string | string[] }>;
}) {
  const { locale, messages } = await getServerLocaleAndMessages('global');
  const { pricing } = messages;
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';

  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await params;
  const checkoutToken = resolvedParams.checkoutToken?.trim();
  if (!checkoutToken) {
    notFound();
  }

  const checkoutAccess = await getCheckoutOrderByTokenForUser({
    checkoutToken,
    userId: user.id
  });
  if (!checkoutAccess) {
    notFound();
  }
  if (
    checkoutAccess.checkoutOrder.targetType === 'team' &&
    checkoutAccess.teamRole !== 'owner'
  ) {
    redirect('/dashboard');
  }

  let checkoutOrder = checkoutAccess.checkoutOrder;
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const statusParam = Array.isArray(resolvedSearchParams?.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams?.status;
  const providerParam = Array.isArray(resolvedSearchParams?.provider)
    ? resolvedSearchParams.provider[0]
    : resolvedSearchParams?.provider;
  if (
    statusParam === 'canceled' &&
    providerParam === 'stripe' &&
    checkoutOrder.status === 'provider_pending'
  ) {
    const canceledCheckoutOrder = await markCheckoutOrderCanceled({
      checkoutOrderId: checkoutOrder.id,
      provider: 'stripe'
    });
    if (canceledCheckoutOrder) {
      checkoutOrder = canceledCheckoutOrder;
    }
  }

  if (
    checkoutOrder.orderType !== 'subscription' &&
    checkoutOrder.orderType !== 'one_time'
  ) {
    notFound();
  }

  const isSubscriptionOrder = checkoutOrder.orderType === 'subscription';
  const template =
    isSubscriptionOrder && checkoutOrder.subscriptionTemplateId
      ? await getSubscriptionTemplateWithFeaturesById(
          checkoutOrder.subscriptionTemplateId
        )
      : null;
  if (isSubscriptionOrder && !template) {
    notFound();
  }

  const [
    stripeEnabled,
    payPalEnabled,
    payPalClientId,
    payPalCurrency,
    paymentMethods,
    persistedOneTimeLineItems
  ] = await Promise.all([
    isStripeConfigured(),
    isPayPalConfigured(),
    getPayPalClientId(),
    getPayPalCurrency(),
    getCheckoutPaymentMethodRegistry(),
    isSubscriptionOrder
      ? Promise.resolve([])
      : listCheckoutOrderLineItems(checkoutOrder.id)
  ]);

  const isPayable = isCheckoutOrderPayable(checkoutOrder);
  const availablePaymentMethods = paymentMethods.methods.filter((method) => {
    if (!supportsCheckoutPaymentMethodOrderType(method, checkoutOrder.orderType)) {
      return false;
    }

    if (method.ownerType !== 'core') {
      return true;
    }

    if (method.paymentMethodId === 'stripe') {
      return stripeEnabled;
    }

    if (method.paymentMethodId === 'paypal') {
      return payPalEnabled && Boolean(payPalClientId);
    }

    return true;
  });
  const canRenderPaymentMethods = isPayable && availablePaymentMethods.length > 0;

  const subscriptionMetadata =
    isSubscriptionOrder ? checkoutOrder.parsedMetadata?.subscription : null;
  const planRelationLabel = resolvePlanRelationLabel({
    relation: subscriptionMetadata?.planRelation,
    pricing
  });
  const scheduledStartDate = subscriptionMetadata?.scheduledStartTime
    ? new Date(subscriptionMetadata.scheduledStartTime)
    : null;
  const checkoutTitle =
    template?.name || checkoutOrder.planName || 'Checkout order';
  const checkoutSubtitle = template
    ? interpolate(
        template.targetScope === 'organization'
          ? pricing.perOrganizationLabel
          : pricing.perUserLabel,
        {
          interval:
            pricing.intervals[
              template.billingInterval as keyof typeof pricing.intervals
            ] || template.billingInterval
        }
      )
    : 'One-time payment';
  const summaryLabel = template ? 'Plan summary' : 'Order summary';
  const summaryAmount = formatMoney(
    template?.priceCents ?? checkoutOrder.amount ?? 0,
    template?.currency ?? checkoutOrder.currency ?? 'USD',
    dateLocale
  );
  const oneTimeSummaryItems: OneTimeSummaryLineItem[] = !isSubscriptionOrder
    ? (() => {
        if (persistedOneTimeLineItems.length > 0) {
          return persistedOneTimeLineItems.map((item) => ({
            key: String(item.id),
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            totalAmount: item.totalAmount,
            currency: item.currency
          }));
        }

        const oneTimeMetadata = checkoutOrder.parsedMetadata?.oneTime;
        const oneTimeSnapshot = oneTimeMetadata?.snapshot;
        const legacyQuantity =
          typeof oneTimeMetadata?.quantity === 'number' &&
          Number.isInteger(oneTimeMetadata.quantity) &&
          oneTimeMetadata.quantity > 0
            ? oneTimeMetadata.quantity
            : 1;
        const legacyAmount = checkoutOrder.amount ?? 0;
        const snapshotUnitAmount =
          typeof oneTimeSnapshot?.unitAmountCents === 'number' &&
          Number.isInteger(oneTimeSnapshot.unitAmountCents) &&
          oneTimeSnapshot.unitAmountCents >= 0
            ? oneTimeSnapshot.unitAmountCents
            : null;
        const useSnapshotUnitAmount =
          snapshotUnitAmount !== null &&
          legacyQuantity * snapshotUnitAmount === legacyAmount;
        const snapshotName =
          typeof oneTimeSnapshot?.name === 'string'
            ? oneTimeSnapshot.name.trim()
            : '';
        const snapshotDescription =
          typeof oneTimeSnapshot?.description === 'string'
            ? oneTimeSnapshot.description.trim()
            : '';
        const fallbackProductKey =
          typeof oneTimeMetadata?.productKey === 'string'
            ? oneTimeMetadata.productKey.trim()
            : '';
        const fallbackName =
          snapshotName ||
          checkoutOrder.planName ||
          fallbackProductKey ||
          'One-time product';
        const fallbackCurrency = checkoutOrder.currency ?? 'USD';

        return [
          {
            key: 'legacy',
            name: fallbackName,
            description: snapshotDescription || null,
            quantity: useSnapshotUnitAmount ? legacyQuantity : 1,
            unitAmount: useSnapshotUnitAmount ? snapshotUnitAmount! : legacyAmount,
            totalAmount: legacyAmount,
            currency: fallbackCurrency
          }
        ];
      })()
    : [];
  const restartHref = isSubscriptionOrder ? '/pricing' : '/products';

  const stripeNode = stripeEnabled ? (
    <form action={checkoutWithPaymentMethodAction}>
      <input type="hidden" name="checkoutToken" value={checkoutOrder.checkoutToken} />
      <input type="hidden" name="paymentMethodId" value="stripe" />
      <SubmitButton />
    </form>
  ) : null;

  const payPalNode = payPalEnabled && payPalClientId ? (
    <PayPalCheckoutButton
      clientId={payPalClientId!}
      checkoutToken={checkoutOrder.checkoutToken}
      currency={payPalCurrency}
    />
  ) : null;

  const paymentMethodOptions = availablePaymentMethods.reduce<
    Array<{ id: string; label: string; content: ReactNode }>
  >((acc, method) => {
      if (method.ownerType === 'core' && method.paymentMethodId === 'stripe') {
        if (!stripeNode) {
          return acc;
        }

        acc.push({
          id: method.paymentMethodId,
          label: pricing.paymentMethodStripe,
          content: stripeNode
        });
        return acc;
      }

      if (method.ownerType === 'core' && method.paymentMethodId === 'paypal') {
        if (!payPalNode) {
          return acc;
        }

        acc.push({
          id: method.paymentMethodId,
          label: pricing.paymentMethodPayPal,
          content: payPalNode
        });
        return acc;
      }

      acc.push({
        id: method.paymentMethodId,
        label: method.displayName,
        content: (
          <div className="space-y-2">
            <form action={checkoutWithPaymentMethodAction}>
              <input
                type="hidden"
                name="checkoutToken"
                value={checkoutOrder.checkoutToken}
              />
              <input
                type="hidden"
                name="paymentMethodId"
                value={method.paymentMethodId}
              />
              <SubmitButton />
            </form>
            {method.description ? (
              <p className="text-xs text-zinc-500">{method.description}</p>
            ) : null}
          </div>
        )
      });

      return acc;
    }, []);

  const statusLabel = checkoutOrder.status.replace('_', ' ');

  return (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
      <section className="mb-10 space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
          Checkout
        </p>
        <h1 className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100 sm:text-5xl">
          {checkoutTitle}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-400">{checkoutSubtitle}</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="marketing-panel rounded-2xl p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            {summaryLabel}
          </p>
          {planRelationLabel ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-amber-200">
              {planRelationLabel}
            </p>
          ) : null}
          <p className="mt-3 text-4xl font-semibold text-zinc-100">
            {summaryAmount}
          </p>
          {template &&
          template.trialPeriodDays > 0 &&
          subscriptionMetadata?.trialEligible !== false ? (
            <p className="mt-2 text-sm text-zinc-400">
              {interpolate(pricing.trialLabel, { days: template.trialPeriodDays })}
            </p>
          ) : null}

          {subscriptionMetadata?.changeMode === 'period_end' && scheduledStartDate ? (
            <p className="mt-4 rounded-lg border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-xs text-amber-100">
              {interpolate(pricing.changeModePeriodEndHint, {
                date: formatDateLabel(scheduledStartDate, dateLocale)
              })}
            </p>
          ) : null}

          {template ? (
            <ul className="mt-6 space-y-2 text-sm text-zinc-300">
              {(template.features.length > 0
                ? template.features.filter((feature) => feature.isPublic)
                : []
              ).map((feature) => {
                const label = feature.label?.trim() || feature.key;
                const value = feature.valueLabel || feature.value || null;
                return (
                  <li key={feature.id} className="rounded-lg border border-white/10 px-3 py-2">
                    {value ? `${label}: ${value}` : label}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                Items
              </p>
              {oneTimeSummaryItems.length > 0 ? (
                <ul className="space-y-2 text-sm text-zinc-300">
                  {oneTimeSummaryItems.map((item) => (
                    <li
                      key={item.key}
                      className="rounded-lg border border-white/10 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-100">
                            {item.name}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-xs text-zinc-400">
                              {item.description}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-zinc-500">
                            Qty {item.quantity} ·{' '}
                            {formatMoney(item.unitAmount, item.currency, dateLocale)} each
                          </p>
                        </div>
                        <p className="text-sm font-medium text-zinc-100">
                          {formatMoney(item.totalAmount, item.currency, dateLocale)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400">
                  No line items were found for this order.
                </p>
              )}
            </div>
          ) : null}
        </section>

        <section className="marketing-panel rounded-2xl p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            {pricing.paymentMethodLabel}
          </p>

          <div className="mt-4 space-y-4">
            {canRenderPaymentMethods ? (
              paymentMethodOptions.length > 1 ? (
                <PaymentMethodSelector
                  label={pricing.paymentMethodLabel}
                  defaultMethod={paymentMethodOptions[0]?.id ?? null}
                  options={paymentMethodOptions}
                />
              ) : (
                <>
                  {paymentMethodOptions[0]?.content}
                </>
              )
            ) : !isPayable ? (
              <div className="space-y-2 rounded-xl border border-amber-200/20 bg-amber-200/10 p-4 text-sm text-amber-100">
                <p className="font-medium capitalize">Checkout {statusLabel}.</p>
                <p className="text-xs text-amber-200/80">
                  Start a new checkout from pricing.
                </p>
                <Link
                  href={restartHref}
                  className="inline-flex items-center text-xs font-medium uppercase tracking-[0.16em] text-amber-100 underline"
                >
                  Restart checkout
                </Link>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">{pricing.noPaymentConfigured}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
