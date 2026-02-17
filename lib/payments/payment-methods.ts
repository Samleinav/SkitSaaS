import { and, eq } from 'drizzle-orm';
import {
  getActiveTeamSubscriptionAssignment,
  getSubscriptionTemplateById
} from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { checkoutOrders, type User } from '@/lib/db/schema';
import {
  getEnabledPaymentMethodRegistry,
  resolveModuleApiHandler
} from '@/lib/modules/runtime';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import {
  ensurePayPalPlanForTemplate,
  getPayPalCurrency
} from './paypal';
import {
  createCheckoutSession,
  getCheckoutSessionRedirectUrl
} from './stripe';
import {
  CHECKOUT_SYSTEM_EVENTS,
  recordCheckoutEvent,
  type CheckoutTemplateSnapshot
} from './checkout-system';
import {
  getCheckoutOrderByToken,
  type CheckoutOrderPaymentProvider,
  type CheckoutOrderWithMetadata,
  isCheckoutOrderPayable,
  markCheckoutOrderCanceled,
  markCheckoutOrderCompleted,
  markCheckoutOrderFailed,
  markCheckoutOrderProviderPending
} from './checkout-orders';
import { isSubscriptionTemplateScopeCompatible } from './subscription-scope';
import {
  isSubscriptionTemplateTrialEligible,
  resolveSubscriptionTrialUsageTarget
} from './subscription-policy';

export type CheckoutPaymentOrderType = 'subscription' | 'one_time';
export type CheckoutPaymentMethodRegistryIssue =
  | {
      code: 'duplicate_payment_method_id';
      paymentMethodId: string;
      source: 'module';
      moduleIds: string[];
      message: string;
    }
  | {
      code: 'duplicate_with_core_method_id';
      paymentMethodId: string;
      source: 'module';
      moduleId: string;
      message: string;
    };

export type ResolvedCheckoutPaymentMethod = {
  paymentMethodId: string;
  ownerType: 'core' | 'module';
  moduleId: string | null;
  displayName: string;
  description: string | null;
  order: number;
  supportsOrderTypes: CheckoutPaymentOrderType[];
  routes: {
    startPath: string;
    cancelPath: string | null;
    returnPath: string | null;
    webhookPath: string | null;
  };
  metadata: Record<string, unknown> | null;
};

export type CheckoutPaymentMethodRegistry = {
  methods: ResolvedCheckoutPaymentMethod[];
  issues: CheckoutPaymentMethodRegistryIssue[];
};

const CORE_CHECKOUT_PAYMENT_METHODS: ResolvedCheckoutPaymentMethod[] = [
  {
    paymentMethodId: 'stripe',
    ownerType: 'core',
    moduleId: null,
    displayName: 'Stripe',
    description: 'Core Stripe subscription checkout adapter.',
    order: 10,
    supportsOrderTypes: ['subscription'],
    routes: {
      startPath: '/api/checkout/{checkoutToken}/pay/stripe',
      cancelPath: '/checkout/{checkoutToken}?status=canceled&provider=stripe',
      returnPath: '/api/checkout/methods/stripe/return',
      webhookPath: '/api/checkout/methods/stripe/webhook'
    },
    metadata: null
  },
  {
    paymentMethodId: 'paypal',
    ownerType: 'core',
    moduleId: null,
    displayName: 'PayPal',
    description: 'Core PayPal subscription checkout adapter.',
    order: 20,
    supportsOrderTypes: ['subscription'],
    routes: {
      startPath: '/api/checkout/{checkoutToken}/pay/paypal',
      cancelPath: '/api/checkout/methods/paypal/cancel',
      returnPath: '/api/checkout/methods/paypal/return',
      webhookPath: '/api/checkout/methods/paypal/webhook'
    },
    metadata: null
  }
];

function normalizeCheckoutPaymentMethodId(value: string) {
  return String(value).trim().toLowerCase();
}

function normalizeCheckoutOrderType(value: string): CheckoutPaymentOrderType | null {
  if (value === 'subscription' || value === 'one_time') {
    return value;
  }

  return null;
}

function normalizeProviderForCheckoutOrder(
  paymentMethod: ResolvedCheckoutPaymentMethod
): CheckoutOrderPaymentProvider {
  if (paymentMethod.ownerType === 'module') {
    return 'module';
  }

  if (paymentMethod.paymentMethodId === 'paypal') {
    return 'paypal';
  }

  return 'stripe';
}

function normalizeCheckoutMetadataRecord(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

function resolveTemplateSnapshot(
  checkoutOrder: CheckoutOrderWithMetadata
): CheckoutTemplateSnapshot | null {
  const snapshot = checkoutOrder.parsedMetadata?.subscription?.templateSnapshot;
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  const requiredKeys: Array<keyof CheckoutTemplateSnapshot> = [
    'templateId',
    'templateName',
    'targetScope',
    'billingInterval',
    'priceCents',
    'compareAtPriceCents',
    'currency',
    'trialPeriodDays',
    'updatedAt',
    'fingerprint'
  ];

  for (const key of requiredKeys) {
    if (!(key in snapshot)) {
      return null;
    }
  }

  return snapshot as CheckoutTemplateSnapshot;
}

async function resolveCheckoutOrderTrialEligibility({
  checkoutOrder,
  template
}: {
  checkoutOrder: CheckoutOrderWithMetadata;
  template: {
    id: number;
    categoryKey: string;
    trialPeriodDays: number;
  };
}) {
  const trialEligibleFromMetadata = checkoutOrder.parsedMetadata?.subscription?.trialEligible;
  if (typeof trialEligibleFromMetadata === 'boolean') {
    return trialEligibleFromMetadata;
  }

  const trialTarget = resolveSubscriptionTrialUsageTarget({
    targetType: checkoutOrder.targetType,
    targetTeamId: checkoutOrder.targetTeamId ?? checkoutOrder.teamId,
    targetUserId: checkoutOrder.targetUserId
  });
  const trialEligibility = await isSubscriptionTemplateTrialEligible({
    template,
    target: trialTarget
  });
  return trialEligibility.trialEligible;
}

export function supportsCheckoutPaymentMethodOrderType(
  paymentMethod: ResolvedCheckoutPaymentMethod,
  orderType: string
) {
  const normalizedOrderType = normalizeCheckoutOrderType(orderType);
  if (!normalizedOrderType) {
    return false;
  }

  return paymentMethod.supportsOrderTypes.includes(normalizedOrderType);
}

export async function getCheckoutPaymentMethodRegistry(): Promise<CheckoutPaymentMethodRegistry> {
  const moduleRegistry = await getEnabledPaymentMethodRegistry();
  const coreMethodIdSet = new Set(
    CORE_CHECKOUT_PAYMENT_METHODS.map((method) => method.paymentMethodId)
  );

  const moduleMethods: ResolvedCheckoutPaymentMethod[] = [];
  const issues: CheckoutPaymentMethodRegistryIssue[] = moduleRegistry.issues.map(
    (issue) => ({
      code: issue.code,
      paymentMethodId: issue.paymentMethodId,
      source: 'module',
      moduleIds: issue.moduleIds,
      message: issue.message
    })
  );

  for (const method of moduleRegistry.methods) {
    if (coreMethodIdSet.has(method.paymentMethodId)) {
      issues.push({
        code: 'duplicate_with_core_method_id',
        paymentMethodId: method.paymentMethodId,
        source: 'module',
        moduleId: method.moduleId,
        message:
          `Module method id "${method.paymentMethodId}" conflicts with a core payment method id.`
      });
      continue;
    }

    moduleMethods.push({
      paymentMethodId: method.paymentMethodId,
      ownerType: 'module',
      moduleId: method.moduleId,
      displayName: method.displayName,
      description: method.description,
      order: method.order,
      supportsOrderTypes: method.supportsOrderTypes,
      routes: method.routes,
      metadata: method.metadata
    });
  }

  const methods = [...CORE_CHECKOUT_PAYMENT_METHODS, ...moduleMethods].sort(
    (left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.displayName.localeCompare(right.displayName);
    }
  );

  return {
    methods,
    issues
  };
}

export async function getCheckoutPaymentMethodById(
  paymentMethodId: string
): Promise<{
  method: ResolvedCheckoutPaymentMethod | null;
  issue: CheckoutPaymentMethodRegistryIssue | null;
  registry: CheckoutPaymentMethodRegistry;
}> {
  const normalizedPaymentMethodId = normalizeCheckoutPaymentMethodId(paymentMethodId);
  const registry = await getCheckoutPaymentMethodRegistry();
  const method =
    registry.methods.find(
      (entry) => entry.paymentMethodId === normalizedPaymentMethodId
    ) ?? null;
  const issue =
    registry.issues.find(
      (entry) => entry.paymentMethodId === normalizedPaymentMethodId
    ) ?? null;

  return {
    method,
    issue,
    registry
  };
}

export type CheckoutPaymentStartSuccess = {
  ok: true;
  paymentMethodId: string;
  status: 'ready' | 'provider_pending';
  redirectUrl: string | null;
  clientPayload: Record<string, unknown> | null;
};

export type CheckoutPaymentStartFailure = {
  ok: false;
  statusCode: number;
  error: string;
};

export type CheckoutPaymentStartResult =
  | CheckoutPaymentStartSuccess
  | CheckoutPaymentStartFailure;

type ModulePaymentMethodActionStatus =
  | 'ready'
  | 'provider_pending'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'ignored';

export type ModulePaymentMethodActionResult = {
  status: ModulePaymentMethodActionStatus;
  checkoutToken?: string | null;
  checkoutOrderId?: number | null;
  redirectUrl?: string | null;
  providerSessionId?: string | null;
  providerReferenceId?: string | null;
  externalOrderId?: string | null;
  externalPaymentId?: string | null;
  providerPlanId?: string | null;
  paymentMethod?: string | null;
  amount?: number | null;
  currency?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  eventType?: string | null;
};

function normalizeModulePaymentMethodActionStatus(
  status: unknown
): ModulePaymentMethodActionStatus {
  if (
    status === 'ready' ||
    status === 'provider_pending' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'canceled' ||
    status === 'ignored'
  ) {
    return status;
  }

  return 'ignored';
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeOptionalAmount(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value);
}

function normalizeOptionalMetadata(value: unknown) {
  return normalizeCheckoutMetadataRecord(value);
}

type CheckoutMethodTelemetryStatus = 'info' | 'success' | 'warning' | 'failed';

async function logCheckoutMethodTelemetry({
  eventType,
  action,
  status,
  paymentMethodId,
  checkoutOrder,
  fallbackCheckoutToken = null,
  message = null,
  metadata = null
}: {
  eventType: string;
  action: 'start' | 'cancel' | 'return' | 'webhook' | 'transition';
  status: CheckoutMethodTelemetryStatus;
  paymentMethodId: string;
  checkoutOrder?: CheckoutOrderWithMetadata | null;
  fallbackCheckoutToken?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await createSysActivityLog({
    eventType,
    eventCategory: 'checkout',
    action,
    status,
    teamId: checkoutOrder?.teamId ?? null,
    targetUserId: checkoutOrder?.targetUserId ?? null,
    entityType: 'checkout_order',
    entityId:
      checkoutOrder?.id ??
      normalizeOptionalText(fallbackCheckoutToken, 120) ??
      null,
    source: '/lib/payments/payment-methods',
    message,
    metadata: {
      paymentMethodId,
      checkoutToken:
        checkoutOrder?.checkoutToken ??
        normalizeOptionalText(fallbackCheckoutToken, 120) ??
        null,
      checkoutOrderStatus: checkoutOrder?.status ?? null,
      ...(metadata || {})
    }
  });
}

function normalizeModulePaymentMethodActionResult(
  payload: unknown
): ModulePaymentMethodActionResult | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const value = payload as Record<string, unknown>;
  return {
    status: normalizeModulePaymentMethodActionStatus(value.status),
    checkoutToken: normalizeOptionalText(value.checkoutToken, 120),
    checkoutOrderId:
      typeof value.checkoutOrderId === 'number' &&
      Number.isInteger(value.checkoutOrderId) &&
      value.checkoutOrderId > 0
        ? value.checkoutOrderId
        : null,
    redirectUrl: normalizeOptionalText(value.redirectUrl, 2000),
    providerSessionId: normalizeOptionalText(value.providerSessionId, 255),
    providerReferenceId: normalizeOptionalText(value.providerReferenceId, 255),
    externalOrderId: normalizeOptionalText(value.externalOrderId, 255),
    externalPaymentId: normalizeOptionalText(value.externalPaymentId, 255),
    providerPlanId: normalizeOptionalText(value.providerPlanId, 255),
    paymentMethod: normalizeOptionalText(value.paymentMethod, 60),
    amount: normalizeOptionalAmount(value.amount),
    currency: normalizeOptionalText(value.currency, 10),
    message: normalizeOptionalText(value.message, 1000),
    metadata: normalizeOptionalMetadata(value.metadata),
    eventType: normalizeOptionalText(value.eventType, 120)
  };
}

function splitModuleApiPath(path: string) {
  const normalizedPath = String(path)
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!normalizedPath) {
    return [] as string[];
  }

  return normalizedPath.split('/').filter(Boolean);
}

function buildPaymentMethodCallbackUrls({
  origin,
  paymentMethodId
}: {
  origin: string;
  paymentMethodId: string;
}) {
  const baseOrigin = origin.replace(/\/+$/, '');
  const encodedPaymentMethodId = encodeURIComponent(paymentMethodId);
  return {
    returnUrl: `${baseOrigin}/api/checkout/methods/${encodedPaymentMethodId}/return`,
    cancelUrl: `${baseOrigin}/api/checkout/methods/${encodedPaymentMethodId}/cancel`,
    webhookUrl: `${baseOrigin}/api/checkout/methods/${encodedPaymentMethodId}/webhook`
  };
}

export function resolveCoreCheckoutLegacyActionPath({
  paymentMethodId,
  action
}: {
  paymentMethodId: string;
  action: 'cancel' | 'return' | 'webhook';
}) {
  if (paymentMethodId === 'paypal') {
    if (action === 'cancel') {
      return '/api/paypal/checkout/cancel';
    }
    if (action === 'return') {
      return '/api/paypal/checkout';
    }
    return '/api/paypal/webhook';
  }

  if (paymentMethodId === 'stripe') {
    if (action === 'return') {
      return '/api/stripe/checkout';
    }
    if (action === 'webhook') {
      return '/api/stripe/webhook';
    }
    return null;
  }

  return null;
}

async function parseCoreActionFailure(response: Response) {
  const jsonBody = await response
    .clone()
    .json()
    .catch(() => null as unknown);
  const redirectUrl =
    jsonBody &&
    typeof jsonBody === 'object' &&
    'redirectUrl' in jsonBody
      ? normalizeOptionalText(
          (jsonBody as Record<string, unknown>).redirectUrl,
          2000
        )
      : null;

  if (jsonBody && typeof jsonBody === 'object' && 'error' in jsonBody) {
    return {
      error: normalizeOptionalText(
        (jsonBody as Record<string, unknown>).error,
        500
      ),
      redirectUrl
    };
  }

  const textBody = await response.text().catch(() => '');
  return {
    error: normalizeOptionalText(textBody, 500) || null,
    redirectUrl
  };
}

async function forwardCoreCheckoutPaymentMethodAction({
  paymentMethod,
  action,
  request,
  fallbackCheckoutToken
}: {
  paymentMethod: ResolvedCheckoutPaymentMethod;
  action: 'cancel' | 'return' | 'webhook';
  request: Request;
  fallbackCheckoutToken: string | null;
}) {
  const legacyPath = resolveCoreCheckoutLegacyActionPath({
    paymentMethodId: paymentMethod.paymentMethodId,
    action
  });
  if (!legacyPath) {
    return {
      ok: false,
      statusCode: 400,
      error: `Core payment method ${paymentMethod.paymentMethodId} does not expose ${action} action bridge.`
    } as const;
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(legacyPath, sourceUrl.origin);
  if (action === 'return') {
    sourceUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });
    if (
      fallbackCheckoutToken &&
      paymentMethod.paymentMethodId === 'stripe' &&
      !targetUrl.searchParams.get('checkout_token')
    ) {
      targetUrl.searchParams.set('checkout_token', fallbackCheckoutToken);
    }
  }

  const headers = new Headers(request.headers);
  headers.delete('content-length');
  headers.delete('host');
  headers.set('x-checkout-legacy-bridge', '1');
  headers.set('x-checkout-legacy-payment-method', paymentMethod.paymentMethodId);
  headers.set('x-checkout-legacy-action', action);

  let method = action === 'return' && paymentMethod.paymentMethodId === 'stripe'
    ? 'GET'
    : 'POST';
  let body: string | undefined = undefined;

  if (method !== 'GET') {
    const requestBody = await request.text().catch(() => '');
    if (action === 'return' && paymentMethod.paymentMethodId === 'paypal') {
      let payload: Record<string, unknown> = {};
      if (requestBody) {
        try {
          const parsed = JSON.parse(requestBody);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            payload = parsed as Record<string, unknown>;
          }
        } catch {
          payload = {};
        }
      }
      if (
        fallbackCheckoutToken &&
        typeof payload.checkoutToken !== 'string'
      ) {
        payload.checkoutToken = fallbackCheckoutToken;
      }
      body = JSON.stringify(payload);
      headers.set('content-type', 'application/json');
    } else {
      body = requestBody || undefined;
    }
  }

  const forwardedResponse = await fetch(targetUrl.toString(), {
    method,
    headers,
    body,
    redirect: 'manual'
  });
  const isRedirectStatus =
    forwardedResponse.status >= 300 && forwardedResponse.status < 400;
  if (!forwardedResponse.ok && !isRedirectStatus) {
    const failure = await parseCoreActionFailure(forwardedResponse);
    return {
      ok: false,
      statusCode: forwardedResponse.status,
      error: failure.error || 'Core payment method action bridge failed.',
      redirectUrl: failure.redirectUrl
    } as const;
  }

  const redirectUrl = normalizeOptionalText(
    forwardedResponse.headers.get('location'),
    2000
  );
  const responseJson = await forwardedResponse
    .clone()
    .json()
    .catch(() => null as unknown);
  const jsonRedirectUrl =
    responseJson &&
    typeof responseJson === 'object' &&
    'redirectUrl' in responseJson
      ? normalizeOptionalText(
          (responseJson as Record<string, unknown>).redirectUrl,
          2000
        )
      : null;

  const checkoutToken =
    normalizeOptionalText(fallbackCheckoutToken, 120) ||
    (responseJson &&
    typeof responseJson === 'object' &&
    'checkoutToken' in responseJson
      ? normalizeOptionalText(
          (responseJson as Record<string, unknown>).checkoutToken,
          120
        )
      : null);
  const checkoutOrder = checkoutToken
    ? await getCheckoutOrderByToken(checkoutToken)
    : null;

  return {
    ok: true,
    result: {
      status: 'ignored',
      checkoutToken: checkoutOrder?.checkoutToken ?? checkoutToken,
      checkoutOrderId: checkoutOrder?.id ?? null,
      redirectUrl: redirectUrl || jsonRedirectUrl,
      paymentMethod: paymentMethod.paymentMethodId,
      metadata: normalizeCheckoutMetadataRecord(responseJson)
    } satisfies ModulePaymentMethodActionResult,
    checkoutOrder
  } as const;
}

async function invokeModulePaymentMethodRoute({
  moduleId,
  path,
  action,
  request,
  payload
}: {
  moduleId: string;
  path: string;
  action: 'start' | 'cancel' | 'return' | 'webhook';
  request: Request;
  payload: Record<string, unknown>;
}) {
  const body = JSON.stringify(payload);
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  headers.delete('host');
  headers.set('content-type', 'application/json');
  headers.set('x-checkout-method-dispatch', action);
  headers.set('x-checkout-method-module-id', moduleId);

  const moduleRequestUrl = new URL(request.url);
  const moduleSlug = splitModuleApiPath(path);
  const encodedSlug = moduleSlug.map((segment) => encodeURIComponent(segment));
  const modulePath = ['/api/modules', encodeURIComponent(moduleId), ...encodedSlug].join(
    '/'
  );
  moduleRequestUrl.pathname = modulePath;

  const forwardedRequest = new Request(moduleRequestUrl.toString(), {
    method: 'POST',
    headers,
    body
  });

  const response = await resolveModuleApiHandler({
    moduleId,
    slug: splitModuleApiPath(path),
    request: forwardedRequest
  });

  if (!response) {
    return {
      ok: false,
      statusCode: 404,
      error: 'Module payment method route is unavailable.'
    } as const;
  }

  const jsonBody = await response
    .json()
    .catch(() => null as unknown);
  const result = normalizeModulePaymentMethodActionResult(jsonBody);

  if (!response.ok || !result) {
    return {
      ok: false,
      statusCode: response.status,
      error:
        (jsonBody && typeof jsonBody === 'object' && 'error' in jsonBody
          ? normalizeOptionalText((jsonBody as Record<string, unknown>).error, 400)
          : null) ||
        'Module payment method did not return a valid action payload.'
    } as const;
  }

  return {
    ok: true,
    result
  } as const;
}

async function applyCheckoutPaymentMethodTransition({
  paymentMethod,
  checkoutOrder,
  actionResult,
  source
}: {
  paymentMethod: ResolvedCheckoutPaymentMethod;
  checkoutOrder: CheckoutOrderWithMetadata;
  actionResult: ModulePaymentMethodActionResult;
  source: 'checkout' | 'webhook';
}) {
  const provider = normalizeProviderForCheckoutOrder(paymentMethod);

  if (actionResult.status === 'provider_pending') {
    await markCheckoutOrderProviderPending({
      checkoutOrderId: checkoutOrder.id,
      provider,
      paymentMethod: actionResult.paymentMethod || paymentMethod.paymentMethodId,
      providerSessionId: actionResult.providerSessionId
    });
    return;
  }

  if (actionResult.status === 'canceled') {
    await markCheckoutOrderCanceled({
      checkoutOrderId: checkoutOrder.id,
      provider
    });
  } else if (actionResult.status === 'failed') {
    await markCheckoutOrderFailed({
      checkoutOrderId: checkoutOrder.id,
      provider,
      providerReferenceId:
        actionResult.providerReferenceId || actionResult.externalPaymentId
    });
  } else if (actionResult.status === 'completed') {
    await markCheckoutOrderCompleted({
      checkoutOrderId: checkoutOrder.id,
      provider,
      providerReferenceId:
        actionResult.providerReferenceId || actionResult.externalPaymentId
    });
  } else {
    return;
  }

  const paymentOrderStatus =
    actionResult.status === 'completed'
      ? 'received'
      : actionResult.status === 'failed'
        ? 'failed'
        : 'canceled';

  const resolvedTargetType =
    checkoutOrder.targetType === 'team' || checkoutOrder.targetType === 'user'
      ? checkoutOrder.targetType
      : null;
  const checkoutOrderSubscriptionMetadata =
    checkoutOrder.orderType === 'subscription'
      ? checkoutOrder.parsedMetadata?.subscription ?? null
      : null;
  const mergedMetadata =
    actionResult.metadata || checkoutOrderSubscriptionMetadata
      ? {
          ...(actionResult.metadata || {}),
          checkoutOrderSubscription: checkoutOrderSubscriptionMetadata
        }
      : undefined;

  await recordCheckoutEvent({
    provider,
    moduleId: paymentMethod.ownerType === 'module' ? paymentMethod.moduleId : null,
    orderType:
      normalizeCheckoutOrderType(checkoutOrder.orderType) ?? 'subscription',
    status: paymentOrderStatus,
    eventType: actionResult.eventType || CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
    source,
    teamId: checkoutOrder.teamId,
    targetType: resolvedTargetType,
    targetTeamId: checkoutOrder.targetTeamId,
    targetUserId: checkoutOrder.targetUserId,
    subscriptionTemplateId: checkoutOrder.subscriptionTemplateId,
    templateSnapshot: resolveTemplateSnapshot(checkoutOrder),
    paymentMethod: actionResult.paymentMethod || paymentMethod.paymentMethodId,
    planName: checkoutOrder.planName,
    providerPlanId: actionResult.providerPlanId,
    externalOrderId: actionResult.externalOrderId,
    externalPaymentId: actionResult.externalPaymentId,
    amount: actionResult.amount ?? checkoutOrder.amount,
    currency: actionResult.currency ?? checkoutOrder.currency,
    message: actionResult.message,
    metadata: mergedMetadata,
    providerMetadata: {
      checkoutOrderId: checkoutOrder.id,
      checkoutToken: checkoutOrder.checkoutToken,
      providerSessionId: actionResult.providerSessionId,
      providerReferenceId: actionResult.providerReferenceId,
      moduleId: paymentMethod.moduleId,
      actionStatus: actionResult.status
    }
  });

  await logCheckoutMethodTelemetry({
    eventType: 'checkout.method.transition',
    action: 'transition',
    status: actionResult.status === 'failed' ? 'failed' : 'success',
    paymentMethodId: paymentMethod.paymentMethodId,
    checkoutOrder,
    message: `Checkout order transitioned to ${actionResult.status}.`,
    metadata: {
      transitionStatus: actionResult.status,
      source,
      provider,
      providerSessionId: actionResult.providerSessionId,
      providerReferenceId: actionResult.providerReferenceId
    }
  });
}

export async function resolveCheckoutProviderPendingStartReuse({
  paymentMethod,
  checkoutOrder
}: {
  paymentMethod: ResolvedCheckoutPaymentMethod;
  checkoutOrder: CheckoutOrderWithMetadata;
}): Promise<CheckoutPaymentStartSuccess | null> {
  if (checkoutOrder.status !== 'provider_pending') {
    return null;
  }

  const selectedProvider = normalizeOptionalText(checkoutOrder.selectedProvider, 30);
  const selectedPaymentMethod = normalizeOptionalText(
    checkoutOrder.selectedPaymentMethod,
    60
  );
  const providerSessionId = normalizeOptionalText(checkoutOrder.providerSessionId, 255);

  if (paymentMethod.ownerType === 'core') {
    if (
      paymentMethod.paymentMethodId === 'stripe' &&
      selectedProvider === 'stripe'
    ) {
      const redirectUrl = providerSessionId
        ? await getCheckoutSessionRedirectUrl(providerSessionId)
        : null;

      return {
        ok: true,
        paymentMethodId: paymentMethod.paymentMethodId,
        status: 'provider_pending',
        redirectUrl,
        clientPayload: {
          idempotencyReused: true,
          providerSessionId
        }
      };
    }

    if (
      paymentMethod.paymentMethodId === 'paypal' &&
      selectedProvider === 'paypal'
    ) {
      return {
        ok: true,
        paymentMethodId: paymentMethod.paymentMethodId,
        status: 'provider_pending',
        redirectUrl: null,
        clientPayload: {
          idempotencyReused: true,
          providerSessionId
        }
      };
    }

    return null;
  }

  if (selectedProvider !== 'module') {
    return null;
  }

  if (selectedPaymentMethod && selectedPaymentMethod !== paymentMethod.paymentMethodId) {
    return null;
  }

  return {
    ok: true,
    paymentMethodId: paymentMethod.paymentMethodId,
    status: 'provider_pending',
    redirectUrl: null,
    clientPayload: {
      idempotencyReused: true,
      providerSessionId
    }
  };
}

async function startStripeCheckoutPayment({
  checkoutOrder,
  team,
  user
}: {
  checkoutOrder: CheckoutOrderWithMetadata;
  team: {
    id: number;
    stripeCustomerId: string | null;
    stripeProductId: string | null;
  };
  user: Pick<User, 'id'>;
}): Promise<CheckoutPaymentStartResult> {
  if (
    checkoutOrder.orderType !== 'subscription' ||
    !checkoutOrder.subscriptionTemplateId
  ) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Stripe core adapter currently supports subscription checkout only.'
    };
  }

  const template = await getSubscriptionTemplateById(
    checkoutOrder.subscriptionTemplateId
  );
  if (!template) {
    return {
      ok: false,
      statusCode: 404,
      error: 'Subscription template not found for Stripe checkout.'
    };
  }

  if (
    !isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: checkoutOrder.targetType,
      templateTargetScope: template.targetScope
    })
  ) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Subscription template scope does not match checkout target.'
    };
  }

  const activeAssignment = await getActiveTeamSubscriptionAssignment(team.id);
  const subscriptionMetadata = checkoutOrder.parsedMetadata?.subscription;
  const trialEligible = await resolveCheckoutOrderTrialEligibility({
    checkoutOrder,
    template
  });
  const stripeSession = await createCheckoutSession({
    team,
    user,
    template,
    changeMode:
      subscriptionMetadata?.changeMode === 'immediate' ||
      subscriptionMetadata?.changeMode === 'period_end'
        ? subscriptionMetadata.changeMode
        : null,
    currentPeriodEnd: activeAssignment?.currentPeriodEnd ?? null,
    trialEndsAt: activeAssignment?.trialEndsAt ?? null,
    currentAssignmentId:
      subscriptionMetadata?.currentAssignmentId ?? activeAssignment?.id ?? null,
    currentTemplateId:
      subscriptionMetadata?.currentTemplateId ??
      activeAssignment?.subscriptionTemplateId ??
      null,
    checkoutToken: checkoutOrder.checkoutToken,
    checkoutOrderId: checkoutOrder.id,
    idempotencyKey: `checkout-order-${checkoutOrder.id}-method-stripe-start`,
    cancelPath: `/checkout/${encodeURIComponent(checkoutOrder.checkoutToken)}?status=canceled&provider=stripe`,
    trialEligible,
    redirectOnSuccess: false
  });

  await markCheckoutOrderProviderPending({
    checkoutOrderId: checkoutOrder.id,
    provider: 'stripe',
    paymentMethod: 'card',
    providerSessionId: stripeSession.id
  });

  return {
    ok: true,
    paymentMethodId: 'stripe',
    status: 'provider_pending',
    redirectUrl: stripeSession.url,
    clientPayload: null
  };
}

async function startPayPalCheckoutPayment({
  checkoutOrder
}: {
  checkoutOrder: CheckoutOrderWithMetadata;
}): Promise<CheckoutPaymentStartResult> {
  if (
    checkoutOrder.orderType !== 'subscription' ||
    !checkoutOrder.subscriptionTemplateId
  ) {
    return {
      ok: false,
      statusCode: 400,
      error: 'PayPal core adapter currently supports subscription checkout only.'
    };
  }

  const template = await getSubscriptionTemplateById(
    checkoutOrder.subscriptionTemplateId
  );
  if (!template) {
    return {
      ok: false,
      statusCode: 404,
      error: 'Subscription template not found for PayPal checkout.'
    };
  }

  if (
    !isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: checkoutOrder.targetType,
      templateTargetScope: template.targetScope
    })
  ) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Subscription template scope does not match checkout target.'
    };
  }

  const trialEligible = await resolveCheckoutOrderTrialEligibility({
    checkoutOrder,
    template
  });
  const payPalPlan = await ensurePayPalPlanForTemplate(template, {
    includeTrial: trialEligible
  });
  const payPalCurrency = await getPayPalCurrency();

  return {
    ok: true,
    paymentMethodId: 'paypal',
    status: 'ready',
    redirectUrl: null,
    clientPayload: {
      flow: 'paypal_subscription',
      checkoutToken: checkoutOrder.checkoutToken,
      planId: payPalPlan.planId,
      currency: payPalCurrency,
      trialEligible
    }
  };
}

async function startModuleCheckoutPayment({
  paymentMethod,
  checkoutOrder,
  request,
  user,
  team
}: {
  paymentMethod: ResolvedCheckoutPaymentMethod;
  checkoutOrder: CheckoutOrderWithMetadata;
  request: Request;
  user: {
    id: number;
    email: string;
    role: string;
  };
  team: {
    id: number;
    name: string;
  } | null;
}): Promise<CheckoutPaymentStartResult> {
  if (paymentMethod.ownerType !== 'module' || !paymentMethod.moduleId) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Payment method is not module-owned.'
    };
  }

  const callbacks = buildPaymentMethodCallbackUrls({
    origin: new URL(request.url).origin,
    paymentMethodId: paymentMethod.paymentMethodId
  });

  const actionResponse = await invokeModulePaymentMethodRoute({
    moduleId: paymentMethod.moduleId,
    path: paymentMethod.routes.startPath,
    action: 'start',
    request,
    payload: {
      action: 'start',
      paymentMethodId: paymentMethod.paymentMethodId,
      checkoutOrder: {
        id: checkoutOrder.id,
        checkoutToken: checkoutOrder.checkoutToken,
        orderType: checkoutOrder.orderType,
        status: checkoutOrder.status,
        amount: checkoutOrder.amount,
        currency: checkoutOrder.currency,
        planName: checkoutOrder.planName,
        teamId: checkoutOrder.teamId,
        targetType: checkoutOrder.targetType,
        targetTeamId: checkoutOrder.targetTeamId,
        targetUserId: checkoutOrder.targetUserId,
        subscriptionTemplateId: checkoutOrder.subscriptionTemplateId,
        metadata: checkoutOrder.parsedMetadata
      },
      actor: {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        teamId: team?.id ?? null,
        teamName: team?.name ?? null
      },
      callbacks
    }
  });

  if (!actionResponse.ok) {
    return {
      ok: false,
      statusCode: actionResponse.statusCode,
      error: actionResponse.error
    };
  }

  await applyCheckoutPaymentMethodTransition({
    paymentMethod,
    checkoutOrder,
    actionResult: actionResponse.result,
    source: 'checkout'
  });

  return {
    ok: true,
    paymentMethodId: paymentMethod.paymentMethodId,
    status:
      actionResponse.result.status === 'provider_pending' ? 'provider_pending' : 'ready',
    redirectUrl: actionResponse.result.redirectUrl ?? null,
    clientPayload: normalizeCheckoutMetadataRecord(actionResponse.result.metadata)
  };
}

async function executeCoreCheckoutPaymentMethodAction({
  paymentMethod,
  action,
  request,
  fallbackCheckoutToken,
  source
}: {
  paymentMethod: ResolvedCheckoutPaymentMethod;
  action: 'cancel' | 'return' | 'webhook';
  request: Request;
  fallbackCheckoutToken: string | null;
  source: 'checkout' | 'webhook';
}) {
  if (action === 'return' || action === 'webhook') {
    return forwardCoreCheckoutPaymentMethodAction({
      paymentMethod,
      action,
      request,
      fallbackCheckoutToken
    });
  }

  const checkoutToken = normalizeOptionalText(fallbackCheckoutToken, 120);
  if (!checkoutToken) {
    return {
      ok: false,
      statusCode: 400,
      error: 'checkoutToken is required for cancel action.'
    } as const;
  }

  const checkoutOrder = await getCheckoutOrderByToken(checkoutToken);
  if (!checkoutOrder) {
    return {
      ok: false,
      statusCode: 404,
      error: 'Checkout order not found.'
    } as const;
  }

  if (!isCheckoutOrderPayable(checkoutOrder)) {
    return {
      ok: true,
      result: {
        status: 'ignored',
        checkoutToken: checkoutOrder.checkoutToken,
        checkoutOrderId: checkoutOrder.id,
        paymentMethod: paymentMethod.paymentMethodId,
        message: 'Checkout order is not payable.'
      } satisfies ModulePaymentMethodActionResult,
      checkoutOrder
    } as const;
  }

  const actionResult: ModulePaymentMethodActionResult = {
    status: 'canceled',
    checkoutToken: checkoutOrder.checkoutToken,
    checkoutOrderId: checkoutOrder.id,
    paymentMethod: paymentMethod.paymentMethodId,
    message: 'Checkout order canceled.'
  };

  await applyCheckoutPaymentMethodTransition({
    paymentMethod,
    checkoutOrder,
    actionResult,
    source
  });

  const refreshedCheckoutOrder =
    (await getCheckoutOrderByToken(checkoutOrder.checkoutToken)) ?? checkoutOrder;

  return {
    ok: true,
    result: actionResult,
    checkoutOrder: refreshedCheckoutOrder
  } as const;
}

export async function startCheckoutPaymentByMethod({
  paymentMethodId,
  checkoutOrder,
  request,
  user,
  team
}: {
  paymentMethodId: string;
  checkoutOrder: CheckoutOrderWithMetadata;
  request: Request;
  user: {
    id: number;
    email: string;
    role: string;
  };
  team: {
    id: number;
    name: string;
    stripeCustomerId: string | null;
    stripeProductId: string | null;
  } | null;
}): Promise<CheckoutPaymentStartResult> {
  if (!isCheckoutOrderPayable(checkoutOrder)) {
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.start.blocked',
      action: 'start',
      status: 'warning',
      paymentMethodId: normalizeCheckoutPaymentMethodId(paymentMethodId),
      checkoutOrder,
      message: 'Checkout order is not payable.'
    });
    return {
      ok: false,
      statusCode: 409,
      error: 'Checkout order is not payable.'
    };
  }

  const resolved = await getCheckoutPaymentMethodById(paymentMethodId);
  if (!resolved.method) {
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.start.failed',
      action: 'start',
      status: 'failed',
      paymentMethodId: normalizeCheckoutPaymentMethodId(paymentMethodId),
      checkoutOrder,
      message: resolved.issue?.message || 'Payment method not found.'
    });
    return {
      ok: false,
      statusCode: 404,
      error: resolved.issue?.message || 'Payment method not found.'
    };
  }

  if (!supportsCheckoutPaymentMethodOrderType(resolved.method, checkoutOrder.orderType)) {
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.start.blocked',
      action: 'start',
      status: 'warning',
      paymentMethodId: resolved.method.paymentMethodId,
      checkoutOrder,
      message: 'Payment method does not support checkout order type.',
      metadata: {
        orderType: checkoutOrder.orderType
      }
    });
    return {
      ok: false,
      statusCode: 400,
      error: 'Payment method does not support this checkout order type.'
    };
  }

  const reusedPendingStart = await resolveCheckoutProviderPendingStartReuse({
    paymentMethod: resolved.method,
    checkoutOrder
  });
  if (reusedPendingStart) {
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.start.reused',
      action: 'start',
      status: 'info',
      paymentMethodId: resolved.method.paymentMethodId,
      checkoutOrder,
      message: 'Reused provider pending start for checkout order.',
      metadata: {
        idempotencyReused: true,
        providerSessionId: checkoutOrder.providerSessionId
      }
    });
    return reusedPendingStart;
  }

  let result: CheckoutPaymentStartResult;

  if (resolved.method.ownerType === 'core') {
    if (!team) {
      result = {
        ok: false,
        statusCode: 400,
        error: 'Core payment methods require team checkout context.'
      };
    } else if (resolved.method.paymentMethodId === 'stripe') {
      result = await startStripeCheckoutPayment({
        checkoutOrder,
        team,
        user
      });
    } else if (resolved.method.paymentMethodId === 'paypal') {
      result = await startPayPalCheckoutPayment({ checkoutOrder });
    } else {
      result = {
        ok: false,
        statusCode: 400,
        error: 'Core payment method is not supported by checkout dispatcher.'
      };
    }
  } else {
    result = await startModuleCheckoutPayment({
      paymentMethod: resolved.method,
      checkoutOrder,
      request,
      user,
      team
    });
  }

  await logCheckoutMethodTelemetry({
    eventType: result.ok
      ? 'checkout.method.start.succeeded'
      : 'checkout.method.start.failed',
    action: 'start',
    status: result.ok ? 'success' : 'failed',
    paymentMethodId: resolved.method.paymentMethodId,
    checkoutOrder,
    message: result.ok ? 'Checkout payment method start executed.' : result.error,
    metadata: result.ok
      ? {
          checkoutStatus: result.status,
          hasRedirectUrl: Boolean(result.redirectUrl)
        }
      : {
          statusCode: result.statusCode
        }
  });

  return result;
}

async function findCheckoutOrderForModuleAction({
  actionResult,
  fallbackCheckoutToken
}: {
  actionResult: ModulePaymentMethodActionResult;
  fallbackCheckoutToken: string | null;
}) {
  const checkoutToken =
    actionResult.checkoutToken ||
    normalizeOptionalText(fallbackCheckoutToken, 120);
  if (!checkoutToken) {
    return null;
  }

  return getCheckoutOrderByToken(checkoutToken);
}

async function ensureCheckoutOrderByIdMatches({
  actionResult,
  checkoutOrder
}: {
  actionResult: ModulePaymentMethodActionResult;
  checkoutOrder: CheckoutOrderWithMetadata | null;
}) {
  if (!checkoutOrder || !actionResult.checkoutOrderId) {
    return checkoutOrder;
  }

  if (checkoutOrder.id === actionResult.checkoutOrderId) {
    return checkoutOrder;
  }

  const [row] = await db
    .select()
    .from(checkoutOrders)
    .where(
      and(
        eq(checkoutOrders.id, actionResult.checkoutOrderId),
        eq(checkoutOrders.checkoutToken, checkoutOrder.checkoutToken)
      )
    )
    .limit(1);

  if (!row) {
    return checkoutOrder;
  }

  return {
    ...row,
    parsedMetadata: checkoutOrder.parsedMetadata
  } as CheckoutOrderWithMetadata;
}

export async function executeCheckoutPaymentMethodAction({
  paymentMethodId,
  action,
  request,
  fallbackCheckoutToken = null,
  source
}: {
  paymentMethodId: string;
  action: 'cancel' | 'return' | 'webhook';
  request: Request;
  fallbackCheckoutToken?: string | null;
  source: 'checkout' | 'webhook';
}) {
  const resolved = await getCheckoutPaymentMethodById(paymentMethodId);
  if (!resolved.method) {
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.callback.failed',
      action,
      status: 'failed',
      paymentMethodId: normalizeCheckoutPaymentMethodId(paymentMethodId),
      fallbackCheckoutToken,
      message: resolved.issue?.message || 'Payment method not found.'
    });
    return {
      ok: false,
      statusCode: 404,
      error: resolved.issue?.message || 'Payment method not found.'
    } as const;
  }

  if (resolved.method.ownerType === 'core') {
    const coreResult = await executeCoreCheckoutPaymentMethodAction({
      paymentMethod: resolved.method,
      action,
      request,
      fallbackCheckoutToken,
      source
    });
    await logCheckoutMethodTelemetry({
      eventType: coreResult.ok
        ? 'checkout.method.callback.succeeded'
        : 'checkout.method.callback.failed',
      action,
      status: coreResult.ok ? 'success' : 'failed',
      paymentMethodId: resolved.method.paymentMethodId,
      checkoutOrder: coreResult.ok ? coreResult.checkoutOrder ?? null : null,
      fallbackCheckoutToken,
      message: coreResult.ok
        ? `Core ${action} action executed for checkout payment method.`
        : coreResult.error,
      metadata: coreResult.ok
        ? {
            actionStatus: coreResult.result.status
          }
        : {
            statusCode: coreResult.statusCode
          }
    });
    return coreResult;
  }

  if (!resolved.method.moduleId) {
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.callback.failed',
      action,
      status: 'failed',
      paymentMethodId: resolved.method.paymentMethodId,
      fallbackCheckoutToken,
      message: 'Module payment method is missing module owner information.'
    });
    return {
      ok: false,
      statusCode: 400,
      error: 'Module payment method is missing module owner information.'
    } as const;
  }

  const routePath =
    action === 'cancel'
      ? resolved.method.routes.cancelPath
      : action === 'return'
        ? resolved.method.routes.returnPath
        : resolved.method.routes.webhookPath;
  if (!routePath) {
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.callback.failed',
      action,
      status: 'failed',
      paymentMethodId: resolved.method.paymentMethodId,
      fallbackCheckoutToken,
      message: `Payment method ${action} route is not configured.`
    });
    return {
      ok: false,
      statusCode: 404,
      error: `Payment method ${action} route is not configured.`
    } as const;
  }

  const requestBody = await request
    .text()
    .catch(() => '');
  let parsedRequestBody: unknown = null;
  if (requestBody) {
    try {
      parsedRequestBody = JSON.parse(requestBody);
    } catch {
      parsedRequestBody = null;
    }
  }
  const payload = normalizeCheckoutMetadataRecord(parsedRequestBody) ?? {};
  const queryEntries = Array.from(new URL(request.url).searchParams.entries());
  const query =
    queryEntries.length > 0
      ? Object.fromEntries(queryEntries)
      : null;

  const dispatchResponse = await invokeModulePaymentMethodRoute({
    moduleId: resolved.method.moduleId,
    path: routePath,
    action,
    request,
    payload: {
      action,
      paymentMethodId: resolved.method.paymentMethodId,
      payload,
      query,
      rawBody: requestBody || null,
      fallbackCheckoutToken
    }
  });

  if (!dispatchResponse.ok) {
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.callback.failed',
      action,
      status: 'failed',
      paymentMethodId: resolved.method.paymentMethodId,
      fallbackCheckoutToken,
      message: dispatchResponse.error,
      metadata: {
        statusCode: dispatchResponse.statusCode
      }
    });
    return dispatchResponse;
  }

  let checkoutOrder = await findCheckoutOrderForModuleAction({
    actionResult: dispatchResponse.result,
    fallbackCheckoutToken
  });
  checkoutOrder = await ensureCheckoutOrderByIdMatches({
    actionResult: dispatchResponse.result,
    checkoutOrder
  });

  if (checkoutOrder) {
    try {
      await applyCheckoutPaymentMethodTransition({
        paymentMethod: resolved.method,
        checkoutOrder,
        actionResult: dispatchResponse.result,
        source
      });
    } catch (error) {
      await logCheckoutMethodTelemetry({
        eventType: 'checkout.method.callback.failed',
        action,
        status: 'failed',
        paymentMethodId: resolved.method.paymentMethodId,
        checkoutOrder,
        fallbackCheckoutToken,
        message: 'Unable to apply checkout payment transition.',
        metadata: {
          error: error instanceof Error ? error.message : 'unknown_error'
        }
      });
      return {
        ok: false,
        statusCode: 500,
        error: 'Unable to apply checkout payment transition.'
      } as const;
    }
  }

  await logCheckoutMethodTelemetry({
    eventType: 'checkout.method.callback.succeeded',
    action,
    status: 'success',
    paymentMethodId: resolved.method.paymentMethodId,
    checkoutOrder,
    fallbackCheckoutToken,
    message: `Module ${action} action executed for checkout payment method.`,
    metadata: {
      actionStatus: dispatchResponse.result.status
    }
  });

  return {
    ok: true,
    result: dispatchResponse.result,
    checkoutOrder
  } as const;
}

export const executeModuleCheckoutPaymentMethodAction =
  executeCheckoutPaymentMethodAction;
