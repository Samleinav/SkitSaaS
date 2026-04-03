import { createHash } from 'node:crypto';
import {
  type ApiResponse,
  Client,
  Environment,
  IntervalUnit,
  PlanRequestStatus,
  SetupFeeFailureAction,
  type Subscription,
  SubscriptionsController,
  TenureType
} from '@paypal/paypal-server-sdk';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  getActiveTeamSubscriptionAssignmentByProviderReferenceId,
  getActiveUserSubscriptionAssignmentByProviderReferenceId,
  getTeamById
} from '@/lib/db/queries';
import { subscriptionTemplates, type SubscriptionTemplate } from '@/lib/db/schema';
import { getPaymentConfigValue } from './config';
import type { CheckoutOrderLineItem } from './checkout-orders';

let payPalClient: {
  cacheKey: string;
  client: Client;
} | null = null;

type PayPalStatus = 'active' | 'trialing' | 'unpaid' | 'canceled';

export type PayPalWebhookEvent = {
  event_type?: string;
  summary?: string;
  resource?: {
    id?: string;
    status?: string;
    plan_id?: string;
    custom_id?: string;
    start_time?: string;
    amount?: {
      value?: string;
      currency_code?: string;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    billing_info?: {
      next_billing_time?: string;
      last_payment?: {
        time?: string;
      };
    };
  };
};

export type PayPalCheckoutTarget = {
  targetType: 'team' | 'user' | null;
  targetTeamId: number | null;
  targetUserId: number | null;
};

export type PayPalOneTimeWebhookDetails = {
  eventType: 'PAYMENT.CAPTURE.COMPLETED' | 'PAYMENT.CAPTURE.PENDING' | 'PAYMENT.CAPTURE.DENIED';
  orderId: string;
  captureId: string | null;
  status: 'received' | 'pending' | 'failed';
  logStatus: 'success' | 'info' | 'failed';
  amount: number | null;
  currency: string | null;
  customId: string | null;
};

type PayPalOneTimeOrderPayload = {
  id?: string;
  status?: string;
  payer?: { payer_id?: string };
  purchase_units?: Array<{
    custom_id?: string;
    amount?: {
      currency_code?: string;
      value?: string;
    };
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }>;
    };
  }>;
};

export type PayPalOneTimeOrderState = {
  orderId: string;
  orderStatus: string | null;
  captureId: string | null;
  captureStatus: string | null;
  effectiveStatus: string | null;
  amount: number | null;
  currency: string | null;
  payerId: string | null;
  customId: string | null;
};

export async function getPayPalClientId() {
  return (
    (await getPaymentConfigValue('paypalPublicClientId')) ||
    (await getPaymentConfigValue('paypalClientId'))
  );
}

export async function isPayPalConfigured() {
  const [publicClientId, clientId, clientSecret, enabledValue] = await Promise.all([
    getPayPalClientId(),
    getPaymentConfigValue('paypalClientId'),
    getPaymentConfigValue('paypalClientSecret'),
    getPaymentConfigValue('paypalEnabled')
  ]);

  const enabled = normalizeConfigBoolean(enabledValue);
  if (enabled === false) {
    return false;
  }

  return Boolean(publicClientId && clientId && clientSecret);
}

export async function getPayPalEnvironment() {
  const configuredEnvironment = (
    (await getPaymentConfigValue('paypalEnvironment')) || 'sandbox'
  ).toLowerCase();

  if (configuredEnvironment === 'production' || configuredEnvironment === 'live') {
    return Environment.Production;
  }

  return Environment.Sandbox;
}

export async function getPayPalApiBaseUrl() {
  return (await getPayPalEnvironment()) === Environment.Production
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function getPayPalCurrency() {
  return (await getPaymentConfigValue('paypalCurrency')) || 'USD';
}

export async function getPayPalClient() {
  const [clientId, clientSecret, environment] = await Promise.all([
    getPaymentConfigValue('paypalClientId'),
    getPaymentConfigValue('paypalClientSecret'),
    getPayPalEnvironment()
  ]);

  if (!clientId || !clientSecret) {
    return null;
  }

  const cacheKey = `${environment}:${clientId}:${clientSecret}`;
  if (!payPalClient || payPalClient.cacheKey !== cacheKey) {
    payPalClient = {
      cacheKey,
      client: new Client({
        environment,
        clientCredentialsAuthCredentials: {
          oAuthClientId: clientId,
          oAuthClientSecret: clientSecret
        }
      })
    };
  }

  return payPalClient.client;
}

export async function getPayPalAccessToken() {
  const client = await getPayPalClient();
  if (!client) {
    return null;
  }

  const token = await client.clientCredentialsAuthManager.fetchToken();
  return token.accessToken;
}

function getTemplatePayPalFingerprint({
  template,
  includeTrial
}: {
  template: SubscriptionTemplate;
  includeTrial: boolean;
}) {
  const payload = JSON.stringify({
    name: template.name,
    billingInterval: template.billingInterval,
    priceCents: template.priceCents,
    currency: template.currency.toLowerCase(),
    trialPeriodDays: includeTrial ? template.trialPeriodDays : 0,
    includeTrial
  });

  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function getPayPalBillingFrequency(interval: string) {
  if (interval === 'daily') {
    return { intervalUnit: IntervalUnit.Day, intervalCount: 1 };
  }

  if (interval === 'weekly') {
    return { intervalUnit: IntervalUnit.Week, intervalCount: 1 };
  }

  if (interval === 'quarterly') {
    return { intervalUnit: IntervalUnit.Month, intervalCount: 3 };
  }

  if (interval === 'semiannual') {
    return { intervalUnit: IntervalUnit.Month, intervalCount: 6 };
  }

  if (interval === 'yearly') {
    return { intervalUnit: IntervalUnit.Year, intervalCount: 1 };
  }

  return { intervalUnit: IntervalUnit.Month, intervalCount: 1 };
}

function formatMoneyValue(amountInCents: number) {
  return (amountInCents / 100).toFixed(2);
}

function parseMoneyValueToCents(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

function normalizeText(value: string | null | undefined, maxLength: number) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function buildPayPalCheckoutTargetCustomId({
  targetType,
  targetTeamId,
  targetUserId
}: {
  targetType: 'team' | 'user';
  targetTeamId?: number | null;
  targetUserId?: number | null;
}) {
  if (targetType === 'user' && targetUserId && Number.isInteger(targetUserId)) {
    return `user:${targetUserId}`;
  }

  if (targetType === 'team' && targetTeamId && Number.isInteger(targetTeamId)) {
    return `team:${targetTeamId}`;
  }

  return null;
}

export function resolvePayPalCheckoutTargetFromCustomId(
  customId: string | null | undefined
): PayPalCheckoutTarget {
  const normalizedCustomId = normalizeText(customId, 255);
  if (!normalizedCustomId) {
    return {
      targetType: null,
      targetTeamId: null,
      targetUserId: null
    };
  }

  if (normalizedCustomId.startsWith('user:')) {
    const parsedUserId = Number(normalizedCustomId.slice('user:'.length));
    if (Number.isInteger(parsedUserId) && parsedUserId > 0) {
      return {
        targetType: 'user',
        targetTeamId: null,
        targetUserId: parsedUserId
      };
    }
  }

  if (normalizedCustomId.startsWith('team:')) {
    const parsedTeamId = Number(normalizedCustomId.slice('team:'.length));
    if (Number.isInteger(parsedTeamId) && parsedTeamId > 0) {
      return {
        targetType: 'team',
        targetTeamId: parsedTeamId,
        targetUserId: null
      };
    }
  }

  const parsedTeamId = Number(normalizedCustomId);
  if (Number.isInteger(parsedTeamId) && parsedTeamId > 0) {
    return {
      targetType: 'team',
      targetTeamId: parsedTeamId,
      targetUserId: null
    };
  }

  return {
    targetType: null,
    targetTeamId: null,
    targetUserId: null
  };
}

export function resolvePayPalOneTimeWebhookDetails(
  event: PayPalWebhookEvent
): PayPalOneTimeWebhookDetails | null {
  const normalizedEventType = normalizeText(event.event_type, 80);
  if (
    normalizedEventType !== 'PAYMENT.CAPTURE.COMPLETED' &&
    normalizedEventType !== 'PAYMENT.CAPTURE.PENDING' &&
    normalizedEventType !== 'PAYMENT.CAPTURE.DENIED'
  ) {
    return null;
  }

  const orderId = normalizeText(
    event.resource?.supplementary_data?.related_ids?.order_id,
    255
  );
  if (!orderId) {
    return null;
  }

  const captureId = normalizeText(event.resource?.id, 255);
  const amount = parseMoneyValueToCents(event.resource?.amount?.value);
  const currency = normalizeText(event.resource?.amount?.currency_code, 10)?.toUpperCase() ?? null;
  const customId = normalizeText(event.resource?.custom_id, 255);

  if (normalizedEventType === 'PAYMENT.CAPTURE.COMPLETED') {
    return {
      eventType: normalizedEventType,
      orderId,
      captureId,
      status: 'received',
      logStatus: 'success',
      amount,
      currency,
      customId
    };
  }

  if (normalizedEventType === 'PAYMENT.CAPTURE.PENDING') {
    return {
      eventType: normalizedEventType,
      orderId,
      captureId,
      status: 'pending',
      logStatus: 'info',
      amount,
      currency,
      customId
    };
  }

  return {
    eventType: normalizedEventType,
    orderId,
    captureId,
    status: 'failed',
    logStatus: 'failed',
    amount,
    currency,
    customId
  };
}

export function resolvePayPalOneTimeOrderState({
  payload,
  fallbackOrderId = null
}: {
  payload: PayPalOneTimeOrderPayload;
  fallbackOrderId?: string | null;
}): PayPalOneTimeOrderState | null {
  const orderId =
    normalizeText(payload.id, 255) ?? normalizeText(fallbackOrderId, 255);
  if (!orderId) {
    return null;
  }

  const purchaseUnit = Array.isArray(payload.purchase_units)
    ? payload.purchase_units[0]
    : null;
  const capture = Array.isArray(purchaseUnit?.payments?.captures)
    ? purchaseUnit.payments?.captures?.[0]
    : null;
  const amountPayload = capture?.amount ?? purchaseUnit?.amount ?? null;
  const orderStatus = normalizeText(payload.status, 40)?.toUpperCase() ?? null;
  const captureStatus = normalizeText(capture?.status, 40)?.toUpperCase() ?? null;

  return {
    orderId,
    orderStatus,
    captureId: normalizeText(capture?.id, 255),
    captureStatus,
    effectiveStatus: captureStatus ?? orderStatus,
    amount: parseMoneyValueToCents(amountPayload?.value),
    currency: normalizeText(amountPayload?.currency_code, 10)?.toUpperCase() ?? null,
    payerId: normalizeText(payload.payer?.payer_id, 255),
    customId: normalizeText(purchaseUnit?.custom_id, 255)
  };
}

function normalizeConfigBoolean(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return null;
}

async function createPayPalProductForTemplate(template: SubscriptionTemplate) {
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    throw new Error('PayPal access token unavailable.');
  }

  const baseUrl = await getPayPalApiBaseUrl();
  const response = await fetch(`${baseUrl}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `tpl-${template.id}-product`
    },
    body: JSON.stringify({
      name: template.name,
      description: `Subscription template ${template.id}`,
      type: 'SERVICE',
      category: 'SOFTWARE'
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text().catch(() => '');
    throw new Error(
      `Unable to create PayPal product. status=${response.status} ${errorPayload}`
    );
  }

  const body = (await response.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    throw new Error('PayPal product id missing in response.');
  }

  await db
    .update(subscriptionTemplates)
    .set({
      paypalProductId: body.id,
      updatedAt: new Date()
    })
    .where(eq(subscriptionTemplates.id, template.id));

  return body.id;
}

async function ensurePayPalProductForTemplate(template: SubscriptionTemplate) {
  if (template.paypalProductId) {
    return template.paypalProductId;
  }

  return createPayPalProductForTemplate(template);
}

function buildPayPalBillingCycles({
  template,
  includeTrial
}: {
  template: SubscriptionTemplate;
  includeTrial: boolean;
}) {
  const cycles = [];
  let sequence = 1;

  if (includeTrial && template.trialPeriodDays > 0) {
    cycles.push({
      tenureType: TenureType.Trial,
      sequence,
      totalCycles: Math.min(template.trialPeriodDays, 999),
      frequency: {
        intervalUnit: IntervalUnit.Day,
        intervalCount: 1
      },
      pricingScheme: {
        fixedPrice: {
          value: formatMoneyValue(0),
          currencyCode: template.currency.toUpperCase()
        }
      }
    });
    sequence += 1;
  }

  const frequency = getPayPalBillingFrequency(template.billingInterval);
  cycles.push({
    tenureType: TenureType.Regular,
    sequence,
    totalCycles: 0,
    frequency: {
      intervalUnit: frequency.intervalUnit,
      intervalCount: frequency.intervalCount
    },
    pricingScheme: {
      fixedPrice: {
        value: formatMoneyValue(template.priceCents),
        currencyCode: template.currency.toUpperCase()
      }
    }
  });

  return cycles;
}

function getPlanIdFromResponse(response: ApiResponse<unknown>) {
  const result = response.result as { id?: string } | undefined;
  if (result?.id) {
    return result.id;
  }

  if (typeof response.body === 'string') {
    try {
      const parsed = JSON.parse(response.body);
      if (typeof parsed?.id === 'string') {
        return parsed.id;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function ensurePayPalPlanForTemplate(
  template: SubscriptionTemplate,
  options?: {
    includeTrial?: boolean;
  }
) {
  if (!(await isPayPalConfigured())) {
    throw new Error('PayPal is not configured.');
  }

  const client = await getPayPalClient();
  if (!client) {
    throw new Error('PayPal is not configured.');
  }

  const includeTrial = options?.includeTrial !== false;
  const fingerprint = getTemplatePayPalFingerprint({
    template,
    includeTrial
  });
  const currentPlanId = includeTrial
    ? template.paypalPlanId
    : template.paypalPlanIdNoTrial;
  const currentPlanFingerprint = includeTrial
    ? template.paypalPlanFingerprint
    : template.paypalPlanFingerprintNoTrial;

  if (currentPlanId && currentPlanFingerprint === fingerprint) {
    return {
      planId: currentPlanId,
      productId: template.paypalProductId ?? null,
      fingerprint,
      includeTrial
    };
  }

  const productId = await ensurePayPalProductForTemplate(template);
  const subscriptionsController = new SubscriptionsController(client);
  const planRequestIdSuffix = includeTrial ? 'trial' : 'notrial';
  const planResponse = await subscriptionsController.createBillingPlan({
    prefer: 'return=representation',
    paypalRequestId: `tpl-${template.id}-plan-${planRequestIdSuffix}-${fingerprint}`,
    body: {
      productId,
      name: `${template.name} (${template.billingInterval})`,
      description: `Subscription template ${template.id}`,
      status: PlanRequestStatus.Active,
      billingCycles: buildPayPalBillingCycles({
        template,
        includeTrial
      }),
      paymentPreferences: {
        autoBillOutstanding: true,
        setupFeeFailureAction: SetupFeeFailureAction.Continue,
        paymentFailureThreshold: 3
      }
    }
  });
  const planId = getPlanIdFromResponse(planResponse);
  if (!planId) {
    throw new Error('PayPal plan id missing in response.');
  }

  await db
    .update(subscriptionTemplates)
    .set({
      ...(includeTrial
        ? {
            paypalPlanId: planId,
            paypalPlanFingerprint: fingerprint
          }
        : {
            paypalPlanIdNoTrial: planId,
            paypalPlanFingerprintNoTrial: fingerprint
          }),
      paypalProductId: productId,
      updatedAt: new Date()
    })
    .where(eq(subscriptionTemplates.id, template.id));

  return {
    planId,
    productId,
    fingerprint,
    includeTrial
  };
}

export async function createPayPalOneTimeOrder({
  checkoutOrderId,
  targetType,
  targetTeamId,
  targetUserId,
  amount,
  currency,
  planName,
  lineItems
}: {
  checkoutOrderId: number;
  targetType: 'team' | 'user';
  targetTeamId?: number | null;
  targetUserId?: number | null;
  amount: number;
  currency: string;
  planName?: string | null;
  lineItems: Array<
    Pick<
      CheckoutOrderLineItem,
      'name' | 'description' | 'quantity' | 'unitAmount' | 'totalAmount' | 'currency'
    >
  >;
}) {
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    throw new Error('PayPal access token unavailable.');
  }

  const normalizedCurrency = normalizeText(currency, 10)?.toUpperCase() || 'USD';
  const normalizedLineItems =
    lineItems.length > 0
      ? lineItems.filter(
          (item) =>
            Number.isInteger(item.quantity) &&
            item.quantity > 0 &&
            Number.isInteger(item.unitAmount) &&
            item.unitAmount >= 0
        )
      : [
          {
            name: normalizeText(planName, 127) ?? 'One-time payment',
            description: null,
            quantity: 1,
            unitAmount: amount,
            totalAmount: amount,
            currency: normalizedCurrency
          }
        ];
  const customId = buildPayPalCheckoutTargetCustomId({
    targetType,
    targetTeamId,
    targetUserId
  });

  const response = await fetch(`${await getPayPalApiBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      'PayPal-Request-Id': `checkout-order-${checkoutOrderId}-paypal-order`
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `checkout-order-${checkoutOrderId}`,
          custom_id: customId ?? undefined,
          description: normalizeText(planName, 127) ?? 'One-time payment',
          amount: {
            currency_code: normalizedCurrency,
            value: formatMoneyValue(amount),
            breakdown: {
              item_total: {
                currency_code: normalizedCurrency,
                value: formatMoneyValue(amount)
              }
            }
          },
          items: normalizedLineItems.map((item) => ({
            name: normalizeText(item.name, 127) ?? 'Item',
            description: normalizeText(item.description, 127) ?? undefined,
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: normalizedCurrency,
              value: formatMoneyValue(item.unitAmount)
            }
          }))
        }
      ]
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text().catch(() => '');
    throw new Error(
      `Unable to create PayPal one-time order. status=${response.status} ${errorPayload}`
    );
  }

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
  };
  if (!body.id) {
    throw new Error('PayPal one-time order id missing in response.');
  }

  return {
    orderId: body.id,
    status: normalizeText(body.status, 40),
    customId
  };
}

export async function getPayPalOneTimeOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    throw new Error('PayPal access token unavailable.');
  }

  const normalizedOrderId = normalizeText(orderId, 255);
  if (!normalizedOrderId) {
    throw new Error('PayPal order id is required.');
  }

  const response = await fetch(
    `${await getPayPalApiBaseUrl()}/v2/checkout/orders/${encodeURIComponent(normalizedOrderId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorPayload = await response.text().catch(() => '');
    throw new Error(
      `Unable to fetch PayPal one-time order. status=${response.status} ${errorPayload}`
    );
  }

  const body =
    (await response.json().catch(() => ({}))) as PayPalOneTimeOrderPayload;
  const orderState = resolvePayPalOneTimeOrderState({
    payload: body,
    fallbackOrderId: normalizedOrderId
  });
  if (!orderState) {
    throw new Error('PayPal one-time order payload is missing order state.');
  }

  return orderState;
}

export async function capturePayPalOneTimeOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    throw new Error('PayPal access token unavailable.');
  }

  const normalizedOrderId = normalizeText(orderId, 255);
  if (!normalizedOrderId) {
    throw new Error('PayPal order id is required.');
  }

  const response = await fetch(
    `${await getPayPalApiBaseUrl()}/v2/checkout/orders/${encodeURIComponent(normalizedOrderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        'PayPal-Request-Id': `paypal-order-${normalizedOrderId}-capture`
      }
    }
  );

  if (!response.ok) {
    const errorPayload = await response.text().catch(() => '');
    throw new Error(
      `Unable to capture PayPal one-time order. status=${response.status} ${errorPayload}`
    );
  }

  const body =
    (await response.json().catch(() => ({}))) as PayPalOneTimeOrderPayload;
  const orderState = resolvePayPalOneTimeOrderState({
    payload: body,
    fallbackOrderId: normalizedOrderId
  });
  if (!orderState) {
    throw new Error('PayPal capture payload is missing order state.');
  }

  return {
    orderId: orderState.orderId,
    captureId: orderState.captureId,
    status: orderState.effectiveStatus,
    amount: orderState.amount,
    currency: orderState.currency,
    payerId: orderState.payerId,
    customId: orderState.customId
  };
}

export async function confirmPayPalSubscriptionForTeam({
  teamId,
  subscriptionId,
  template
}: {
  teamId: number;
  subscriptionId: string;
  template?: SubscriptionTemplate | null;
}) {
  const client = await getPayPalClient();
  if (!client) {
    throw new Error('PayPal is not configured.');
  }

  const subscriptionsController = new SubscriptionsController(client);
  const subscriptionResponse = await subscriptionsController.getSubscription({
    id: subscriptionId,
    fields: 'plan,billing_info'
  });

  const subscriptionStatus = normalizePayPalStatus(
    getSubscriptionStatus(subscriptionResponse)
  );
  const planId =
    subscriptionResponse.result.planId ??
    getSubscriptionFieldFromBody(subscriptionResponse.body, 'plan_id');
  const billingInfo = subscriptionResponse.result as Subscription & {
    billingInfo?: { nextBillingTime?: string; lastPayment?: { time?: string } };
    billing_info?: { next_billing_time?: string; last_payment?: { time?: string } };
  };
  const currentPeriodEnd =
    billingInfo.billingInfo?.nextBillingTime ??
    billingInfo.billing_info?.next_billing_time ??
    null;
  const currentPeriodStart =
    billingInfo.billingInfo?.lastPayment?.time ??
    billingInfo.billing_info?.last_payment?.time ??
    null;
  const matchedTemplate = template ?? null;
  const planName =
    matchedTemplate?.name ??
    (await getPayPalPlanNameFromPlanId(planId)) ??
    subscriptionResponse.result.plan?.name ??
    null;

  return {
    planId,
    planName,
    subscriptionStatus,
    templateId: matchedTemplate?.id ?? null,
    currentPeriodStart,
    currentPeriodEnd
  };
}

export async function cancelPayPalSubscription(subscriptionId: string) {
  const client = await getPayPalClient();
  if (!client) {
    throw new Error('PayPal is not configured.');
  }

  const subscriptionsController = new SubscriptionsController(client);
  await subscriptionsController.cancelSubscription({
    id: subscriptionId,
    body: {
      reason: 'Cancelled by customer'
    }
  });
}

export async function handlePayPalWebhookEvent(event: PayPalWebhookEvent) {
  const subscriptionId = event.resource?.id;
  if (!subscriptionId) {
    return {
      handled: false,
      targetType: null,
      targetTeamId: null,
      targetUserId: null,
      subscriptionStatus: null,
      currentPeriodStart: null,
      currentPeriodEnd: null
    };
  }

  const [teamAssignment, userAssignment] = await Promise.all([
    getActiveTeamSubscriptionAssignmentByProviderReferenceId({
      provider: 'paypal',
      referenceId: subscriptionId
    }),
    getActiveUserSubscriptionAssignmentByProviderReferenceId({
      provider: 'paypal',
      referenceId: subscriptionId
    })
  ]);

  let targetType: 'team' | 'user' | null = null;
  let targetTeamId: number | null = teamAssignment?.targetTeamId ?? null;
  let targetUserId: number | null = userAssignment?.targetUserId ?? null;

  if (targetUserId) {
    targetType = 'user';
  } else if (targetTeamId) {
    targetType = 'team';
  } else if (event.resource?.custom_id) {
    const parsedTarget = resolvePayPalCheckoutTargetFromCustomId(
      event.resource.custom_id
    );
    if (parsedTarget.targetType === 'user' && parsedTarget.targetUserId) {
      targetType = 'user';
      targetUserId = parsedTarget.targetUserId;
    } else if (parsedTarget.targetType === 'team' && parsedTarget.targetTeamId) {
      const team = await getTeamById(parsedTarget.targetTeamId);
      if (team) {
        targetType = 'team';
        targetTeamId = team.id;
      }
    }
  }

  if (!targetType) {
    console.error('Checkout target not found for PayPal subscription:', subscriptionId);
    return {
      handled: false,
      targetType: null,
      targetTeamId: null,
      targetUserId: null,
      subscriptionStatus: null,
      currentPeriodStart: null,
      currentPeriodEnd: null
    };
  }

  const subscriptionStatus = normalizePayPalStatus(
    event.resource?.status || event.event_type
  );
  const planId =
    event.resource?.plan_id ??
    teamAssignment?.providerPlanId ??
    userAssignment?.providerPlanId ??
    null;
  const planName =
    (await getPayPalPlanNameFromPlanId(planId)) ??
    teamAssignment?.planName ??
    userAssignment?.planName ??
    null;
  const currentPeriodEnd =
    event.resource?.billing_info?.next_billing_time ?? null;
  const currentPeriodStart =
    event.resource?.billing_info?.last_payment?.time ??
    event.resource?.start_time ??
    null;

  return {
    handled: true,
    targetType,
    targetTeamId: targetType === 'team' ? targetTeamId : null,
    targetUserId: targetType === 'user' ? targetUserId : null,
    subscriptionStatus,
    planName,
    currentPeriodStart,
    currentPeriodEnd
  };
}

function getSubscriptionStatus(subscriptionResponse: ApiResponse<Subscription>) {
  const statusFromResult = (subscriptionResponse.result as Subscription & {
    status?: unknown;
  }).status;
  if (typeof statusFromResult === 'string') {
    return statusFromResult;
  }

  const statusFromBody = getSubscriptionFieldFromBody(
    subscriptionResponse.body,
    'status'
  );

  return statusFromBody;
}

function getSubscriptionFieldFromBody(
  body: ApiResponse<Subscription>['body'],
  field: string
) {
  if (typeof body !== 'string') {
    return null;
  }

  try {
    const parsedBody = JSON.parse(body);
    return typeof parsedBody?.[field] === 'string' ? parsedBody[field] : null;
  } catch {
    return null;
  }
}

async function getPayPalPlanNameFromPlanId(planId: string | null) {
  if (!planId) {
    return null;
  }

  const client = await getPayPalClient();
  if (!client) {
    return null;
  }

  const subscriptionsController = new SubscriptionsController(client);
  try {
    const response = await subscriptionsController.getBillingPlan(planId);
    const nameFromResult = (response.result as { name?: string }).name;
    if (typeof nameFromResult === 'string') {
      return nameFromResult;
    }

    if (typeof response.body === 'string') {
      try {
        const parsedBody = JSON.parse(response.body);
        if (typeof parsedBody?.name === 'string') {
          return parsedBody.name;
        }
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function normalizePayPalStatus(status: string | null | undefined): PayPalStatus {
  if (!status) {
    return 'trialing';
  }

  const normalized = status.toUpperCase();

  if (normalized.includes('ACTIVE')) {
    return 'active';
  }

  if (normalized.includes('SUSPEND')) {
    return 'unpaid';
  }

  if (
    normalized.includes('CANCEL') ||
    normalized.includes('EXPIRE') ||
    normalized.includes('TERMINATE')
  ) {
    return 'canceled';
  }

  if (normalized.includes('APPROVAL_PENDING') || normalized.includes('CREATED')) {
    return 'trialing';
  }

  return 'trialing';
}
