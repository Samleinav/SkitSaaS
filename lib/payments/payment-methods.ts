import { and, eq } from 'drizzle-orm';
import {
  getActiveUserSubscriptionAssignment,
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
  getPayPalCurrency,
  buildPayPalCheckoutTargetCustomId,
  createPayPalOneTimeOrder
} from './paypal';
import { createCheckoutPaymentAttemptLog } from './attempt-logs';
import {
  executePayPalCheckoutReturnAction,
  executeStripeCheckoutReturnAction
} from './core-return-actions';
import {
  executePayPalCheckoutWebhookAction,
  executeStripeCheckoutWebhookAction
} from './core-webhook-actions';
import {
  createCheckoutSession,
  createOneTimeCheckoutSession,
  getCheckoutSessionRedirectUrl
} from './stripe';
import {
  CHECKOUT_SYSTEM_EVENTS,
  recordCheckoutEvent,
  type CheckoutTemplateSnapshot
} from './checkout-system';
import {
  getCheckoutOrderByToken,
  listCheckoutOrderLineItems,
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
export type CheckoutPaymentTargetType = 'team' | 'user';
export type CheckoutPaymentMethodUiMode = 'submit' | 'embedded' | 'redirect';
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
  supportsTargetTypes: CheckoutPaymentTargetType[];
  routes: {
    startPath: string;
    cancelPath: string | null;
    returnPath: string | null;
    webhookPath: string | null;
  };
  checkoutUi: {
    mode: CheckoutPaymentMethodUiMode;
    badge: string | null;
    iconKey: string | null;
    ctaLabel: string | null;
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
    description: 'Core Stripe checkout adapter for subscriptions and one-time payments.',
    order: 10,
    supportsOrderTypes: ['subscription', 'one_time'],
    supportsTargetTypes: ['team', 'user'],
    routes: {
      startPath: '/api/checkout/{checkoutToken}/pay/stripe',
      cancelPath: '/checkout/{checkoutToken}?status=canceled&provider=stripe',
      returnPath: '/api/checkout/methods/stripe/return',
      webhookPath: '/api/checkout/methods/stripe/webhook'
    },
    checkoutUi: {
      mode: 'submit',
      badge: 'Hosted',
      iconKey: 'credit-card',
      ctaLabel: 'Continue with Stripe'
    },
    metadata: null
  },
  {
    paymentMethodId: 'paypal',
    ownerType: 'core',
    moduleId: null,
    displayName: 'PayPal',
    description: 'Core PayPal checkout adapter for subscriptions and one-time payments.',
    order: 20,
    supportsOrderTypes: ['subscription', 'one_time'],
    supportsTargetTypes: ['team', 'user'],
    routes: {
      startPath: '/api/checkout/{checkoutToken}/pay/paypal',
      cancelPath: '/api/checkout/methods/paypal/cancel',
      returnPath: '/api/checkout/methods/paypal/return',
      webhookPath: '/api/checkout/methods/paypal/webhook'
    },
    checkoutUi: {
      mode: 'embedded',
      badge: 'Express',
      iconKey: 'wallet',
      ctaLabel: 'Continue with PayPal'
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

function normalizeCheckoutAttemptTargetType(value: unknown): 'team' | 'user' | null {
  if (value === 'team' || value === 'user') {
    return value;
  }

  return null;
}

async function logCheckoutPaymentAttempt({
  paymentMethodId,
  paymentMethod = null,
  checkoutOrder = null,
  fallbackCheckoutToken = null,
  eventType,
  status = 'info',
  source = 'system',
  providerSessionId = null,
  providerReferenceId = null,
  externalOrderId = null,
  externalPaymentId = null,
  message = null,
  metadata = null
}: {
  paymentMethodId: string;
  paymentMethod?: ResolvedCheckoutPaymentMethod | null;
  checkoutOrder?: CheckoutOrderWithMetadata | null;
  fallbackCheckoutToken?: string | null;
  eventType: string;
  status?: 'info' | 'success' | 'warning' | 'failed';
  source?: string;
  providerSessionId?: string | null;
  providerReferenceId?: string | null;
  externalOrderId?: string | null;
  externalPaymentId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await createCheckoutPaymentAttemptLog({
    checkoutOrderId: checkoutOrder?.id ?? null,
    checkoutToken: checkoutOrder?.checkoutToken ?? fallbackCheckoutToken,
    paymentMethodId:
      normalizeCheckoutPaymentMethodId(
        paymentMethod?.paymentMethodId ?? paymentMethodId
      ) || 'unknown',
    provider: paymentMethod ? normalizeProviderForCheckoutOrder(paymentMethod) : 'unknown',
    ownerType: paymentMethod?.ownerType ?? 'unknown',
    moduleId: paymentMethod?.moduleId ?? null,
    orderType: normalizeCheckoutOrderType(checkoutOrder?.orderType ?? '') ?? null,
    source,
    eventType,
    status,
    teamId: checkoutOrder?.teamId ?? null,
    targetType: normalizeCheckoutAttemptTargetType(checkoutOrder?.targetType),
    targetTeamId: checkoutOrder?.targetTeamId ?? null,
    targetUserId: checkoutOrder?.targetUserId ?? null,
    providerSessionId,
    providerReferenceId,
    externalOrderId,
    externalPaymentId,
    message,
    metadata
  });
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

async function resolveCoreOneTimeCheckoutLineItems(
  checkoutOrder: CheckoutOrderWithMetadata
) {
  const persistedLineItems = await listCheckoutOrderLineItems(checkoutOrder.id);
  if (persistedLineItems.length > 0) {
    return persistedLineItems.map((item) => ({
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

  return [
    {
      name:
        snapshotName ||
        checkoutOrder.planName ||
        fallbackProductKey ||
        'One-time product',
      description: snapshotDescription || null,
      quantity: useSnapshotUnitAmount ? legacyQuantity : 1,
      unitAmount: useSnapshotUnitAmount ? snapshotUnitAmount! : legacyAmount,
      totalAmount: legacyAmount,
      currency: checkoutOrder.currency ?? 'USD'
    }
  ];
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

export function supportsCheckoutPaymentMethodTargetType(
  paymentMethod: ResolvedCheckoutPaymentMethod,
  targetType: string | null | undefined
) {
  if (targetType !== 'team' && targetType !== 'user') {
    return false;
  }

  return paymentMethod.supportsTargetTypes.includes(targetType);
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
      supportsTargetTypes: method.supportsTargetTypes,
      routes: method.routes,
      checkoutUi: method.checkoutUi,
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

type CheckoutCallbackObservation = {
  attemptEventType: string;
  attemptStatus: 'info' | 'success' | 'warning' | 'failed';
  telemetryEventType:
    | 'checkout.method.callback.succeeded'
    | 'checkout.method.callback.provider_pending'
    | 'checkout.method.callback.ignored'
    | 'checkout.method.callback.replayed'
    | 'checkout.method.callback.failed';
  telemetryStatus: CheckoutMethodTelemetryStatus;
  message: string;
  metadata: Record<string, unknown>;
};

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

function hasReplayLikeCheckoutCallbackMetadata(
  metadata: Record<string, unknown> | null | undefined
) {
  return metadata?.replayed === true || metadata?.alreadyCompleted === true;
}

export function resolveCheckoutCallbackObservation({
  action,
  actionResult,
  ownerType
}: {
  action: 'cancel' | 'return' | 'webhook';
  actionResult: ModulePaymentMethodActionResult;
  ownerType: 'core' | 'module';
}): CheckoutCallbackObservation {
  const ownerLabel = ownerType === 'core' ? 'Core' : 'Module';
  const callbackOutcome = hasReplayLikeCheckoutCallbackMetadata(
    actionResult.metadata
  )
    ? 'replayed'
    : actionResult.status === 'provider_pending'
      ? 'provider_pending'
      : actionResult.status === 'ignored'
        ? 'ignored'
        : actionResult.status === 'failed'
          ? 'failed'
          : 'succeeded';

  const metadata = {
    actionStatus: actionResult.status,
    callbackOutcome
  } satisfies Record<string, unknown>;

  if (callbackOutcome === 'failed') {
    return {
      attemptEventType: `${action}_failed`,
      attemptStatus: 'failed',
      telemetryEventType: 'checkout.method.callback.failed',
      telemetryStatus: 'failed',
      message: `${ownerLabel} ${action} action reported a failed checkout state.`,
      metadata
    };
  }

  if (callbackOutcome === 'replayed') {
    return {
      attemptEventType: `${action}_replayed`,
      attemptStatus: 'info',
      telemetryEventType: 'checkout.method.callback.replayed',
      telemetryStatus: 'info',
      message: `${ownerLabel} ${action} action reused an already settled checkout state.`,
      metadata
    };
  }

  if (callbackOutcome === 'provider_pending') {
    return {
      attemptEventType: `${action}_provider_pending`,
      attemptStatus: 'info',
      telemetryEventType: 'checkout.method.callback.provider_pending',
      telemetryStatus: 'info',
      message: `${ownerLabel} ${action} action left checkout in provider_pending.`,
      metadata
    };
  }

  if (callbackOutcome === 'ignored') {
    return {
      attemptEventType: `${action}_ignored`,
      attemptStatus: 'info',
      telemetryEventType: 'checkout.method.callback.ignored',
      telemetryStatus: 'info',
      message: `${ownerLabel} ${action} action was ignored for this checkout state.`,
      metadata
    };
  }

  return {
    attemptEventType: `${action}_succeeded`,
    attemptStatus: 'success',
    telemetryEventType: 'checkout.method.callback.succeeded',
    telemetryStatus: 'success',
    message: `${ownerLabel} ${action} action executed for checkout payment method.`,
    metadata
  };
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
    await logCheckoutPaymentAttempt({
      paymentMethodId: paymentMethod.paymentMethodId,
      paymentMethod,
      checkoutOrder,
      source,
      eventType: 'transition_provider_pending',
      status: 'info',
      providerSessionId: actionResult.providerSessionId,
      providerReferenceId: actionResult.providerReferenceId,
      externalOrderId: actionResult.externalOrderId,
      externalPaymentId: actionResult.externalPaymentId,
      message: actionResult.message || 'Checkout order moved to provider_pending.',
      metadata: actionResult.metadata
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
  const normalizedOrderType = normalizeCheckoutOrderType(checkoutOrder.orderType);
  if (!normalizedOrderType) {
    console.error('Unable to record checkout event with invalid checkout order type.', {
      checkoutOrderId: checkoutOrder.id,
      orderType: checkoutOrder.orderType,
      provider,
      paymentMethodId: paymentMethod.paymentMethodId
    });
    return;
  }

  await recordCheckoutEvent({
    provider,
    moduleId: paymentMethod.ownerType === 'module' ? paymentMethod.moduleId : null,
    orderType: normalizedOrderType,
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

  await logCheckoutPaymentAttempt({
    paymentMethodId: paymentMethod.paymentMethodId,
    paymentMethod,
    checkoutOrder,
    source,
    eventType: `transition_${actionResult.status}`,
    status:
      actionResult.status === 'completed'
        ? 'success'
        : actionResult.status === 'failed'
          ? 'failed'
          : 'warning',
    providerSessionId: actionResult.providerSessionId,
    providerReferenceId: actionResult.providerReferenceId,
    externalOrderId: actionResult.externalOrderId,
    externalPaymentId: actionResult.externalPaymentId,
    message:
      actionResult.message || `Checkout order transitioned to ${actionResult.status}.`,
    metadata: mergedMetadata
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
  } | null;
  user: Pick<User, 'id'>;
}): Promise<CheckoutPaymentStartResult> {
  const targetType = checkoutOrder.targetType;
  if (targetType !== 'team' && targetType !== 'user') {
    return {
      ok: false,
      statusCode: 400,
      error: 'Checkout order target is invalid for Stripe checkout.'
    };
  }

  if (targetType === 'team' && !team) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Stripe team checkout requires team context.'
    };
  }

  const resolvedTargetTeamId = targetType === 'team' ? team!.id : null;
  const resolvedTargetUserId =
    targetType === 'user' ? checkoutOrder.targetUserId : null;
  const cancelPath = `/checkout/${encodeURIComponent(checkoutOrder.checkoutToken)}?status=canceled&provider=stripe`;

  let stripeSession: Awaited<ReturnType<typeof createCheckoutSession>> | Awaited<ReturnType<typeof createOneTimeCheckoutSession>> | null = null;

  if (checkoutOrder.orderType === 'one_time') {
    const oneTimeLineItems = await resolveCoreOneTimeCheckoutLineItems(checkoutOrder);
    const oneTimeAmount =
      checkoutOrder.amount ??
      oneTimeLineItems.reduce((total, item) => total + item.totalAmount, 0);
    if (!Number.isInteger(oneTimeAmount) || oneTimeAmount <= 0) {
      return {
        ok: false,
        statusCode: 400,
        error: 'One-time checkout amount is invalid for Stripe checkout.'
      };
    }

    stripeSession = await createOneTimeCheckoutSession({
      team,
      user,
      targetType,
      targetTeamId: resolvedTargetTeamId,
      targetUserId: resolvedTargetUserId,
      checkoutToken: checkoutOrder.checkoutToken,
      checkoutOrderId: checkoutOrder.id,
      amount: oneTimeAmount,
      currency: checkoutOrder.currency ?? 'USD',
      planName: checkoutOrder.planName,
      lineItems: oneTimeLineItems,
      idempotencyKey: `checkout-order-${checkoutOrder.id}-method-stripe-start`,
      cancelPath,
      redirectOnSuccess: false
    });
  } else {
    if (!checkoutOrder.subscriptionTemplateId) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Subscription template not found for Stripe checkout.'
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

    const activeAssignment =
      targetType === 'team'
        ? await getActiveTeamSubscriptionAssignment(team!.id)
        : checkoutOrder.targetUserId
          ? await getActiveUserSubscriptionAssignment(checkoutOrder.targetUserId)
          : null;
    const subscriptionMetadata = checkoutOrder.parsedMetadata?.subscription;
    const trialEligible = await resolveCheckoutOrderTrialEligibility({
      checkoutOrder,
      template
    });
    stripeSession = await createCheckoutSession({
      team,
      user,
      targetType,
      targetTeamId: resolvedTargetTeamId,
      targetUserId: resolvedTargetUserId,
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
      cancelPath,
      trialEligible,
      redirectOnSuccess: false
    });
  }

  await markCheckoutOrderProviderPending({
    checkoutOrderId: checkoutOrder.id,
    provider: 'stripe',
    paymentMethod: 'card',
    providerSessionId: stripeSession.id
  });
  await logCheckoutPaymentAttempt({
    paymentMethodId: 'stripe',
    paymentMethod: {
      paymentMethodId: 'stripe',
      ownerType: 'core',
      moduleId: null,
      displayName: 'Stripe',
      description: null,
      order: 10,
      supportsOrderTypes: ['subscription', 'one_time'],
      supportsTargetTypes: ['team', 'user'],
      routes: {
        startPath: '/api/checkout/{checkoutToken}/pay/stripe',
        cancelPath: '/checkout/{checkoutToken}?status=canceled&provider=stripe',
        returnPath: '/api/checkout/methods/stripe/return',
        webhookPath: '/api/checkout/methods/stripe/webhook'
      },
      checkoutUi: {
        mode: 'submit',
        badge: 'Hosted',
        iconKey: 'credit-card',
        ctaLabel: 'Continue with Stripe'
      },
      metadata: null
    },
    checkoutOrder,
    source: 'checkout',
    eventType: 'transition_provider_pending',
    status: 'info',
    providerSessionId: stripeSession.id,
    message:
      checkoutOrder.orderType === 'one_time'
        ? 'Stripe one-time checkout session created and checkout order moved to provider_pending.'
        : 'Stripe checkout session created and checkout order moved to provider_pending.'
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
  const targetType = checkoutOrder.targetType;
  if (targetType !== 'team' && targetType !== 'user') {
    return {
      ok: false,
      statusCode: 400,
      error: 'Checkout order target is invalid for PayPal checkout.'
    };
  }

  const customId = buildPayPalCheckoutTargetCustomId({
    targetType,
    targetTeamId: targetType === 'team' ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId : null,
    targetUserId: targetType === 'user' ? checkoutOrder.targetUserId : null
  });

  if (checkoutOrder.orderType === 'one_time') {
    const payPalCurrency = await getPayPalCurrency();
    const oneTimeLineItems = await resolveCoreOneTimeCheckoutLineItems(checkoutOrder);
    const oneTimeAmount =
      checkoutOrder.amount ??
      oneTimeLineItems.reduce((total, item) => total + item.totalAmount, 0);
    if (!Number.isInteger(oneTimeAmount) || oneTimeAmount <= 0) {
      return {
        ok: false,
        statusCode: 400,
        error: 'One-time checkout amount is invalid for PayPal checkout.'
      };
    }

    const oneTimeOrder = await createPayPalOneTimeOrder({
      checkoutOrderId: checkoutOrder.id,
      targetType,
      targetTeamId: targetType === 'team' ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId : null,
      targetUserId: targetType === 'user' ? checkoutOrder.targetUserId : null,
      amount: oneTimeAmount,
      currency: checkoutOrder.currency ?? payPalCurrency,
      planName: checkoutOrder.planName,
      lineItems: oneTimeLineItems
    });

    await markCheckoutOrderProviderPending({
      checkoutOrderId: checkoutOrder.id,
      provider: 'paypal',
      paymentMethod: 'paypal',
      providerSessionId: oneTimeOrder.orderId
    });

    return {
      ok: true,
      paymentMethodId: 'paypal',
      status: 'provider_pending',
      redirectUrl: null,
      clientPayload: {
        flow: 'paypal_onetime',
        checkoutToken: checkoutOrder.checkoutToken,
        orderId: oneTimeOrder.orderId,
        currency: checkoutOrder.currency ?? payPalCurrency,
        customId: oneTimeOrder.customId
      }
    };
  }

  if (!checkoutOrder.subscriptionTemplateId) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Subscription template not found for PayPal checkout.'
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
      trialEligible,
      customId
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
  if (action === 'return') {
    if (paymentMethod.paymentMethodId === 'stripe') {
      return executeStripeCheckoutReturnAction({
        request,
        fallbackCheckoutToken,
        source: '/api/checkout/methods/stripe/return'
      });
    }

    if (paymentMethod.paymentMethodId === 'paypal') {
      return executePayPalCheckoutReturnAction({
        request,
        fallbackCheckoutToken,
        source: '/api/checkout/methods/paypal/return'
      });
    }
  }

  if (action === 'webhook') {
    if (paymentMethod.paymentMethodId === 'stripe') {
      return executeStripeCheckoutWebhookAction({
        request,
        fallbackCheckoutToken,
        source: '/api/checkout/methods/stripe/webhook'
      });
    }

    if (paymentMethod.paymentMethodId === 'paypal') {
      return executePayPalCheckoutWebhookAction({
        request,
        fallbackCheckoutToken,
        source: '/api/checkout/methods/paypal/webhook'
      });
    }
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
    await logCheckoutPaymentAttempt({
      paymentMethodId,
      checkoutOrder,
      source: 'checkout',
      eventType: 'start_blocked',
      status: 'warning',
      message: 'Checkout order is not payable.'
    });
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
    await logCheckoutPaymentAttempt({
      paymentMethodId,
      checkoutOrder,
      source: 'checkout',
      eventType: 'start_failed',
      status: 'failed',
      message: resolved.issue?.message || 'Payment method not found.'
    });
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

  await logCheckoutPaymentAttempt({
    paymentMethodId: resolved.method.paymentMethodId,
    paymentMethod: resolved.method,
    checkoutOrder,
    source: 'checkout',
    eventType: 'start_requested',
    status: 'info',
    message: 'Checkout payment method start requested.'
  });

  if (!supportsCheckoutPaymentMethodOrderType(resolved.method, checkoutOrder.orderType)) {
    await logCheckoutPaymentAttempt({
      paymentMethodId: resolved.method.paymentMethodId,
      paymentMethod: resolved.method,
      checkoutOrder,
      source: 'checkout',
      eventType: 'start_blocked',
      status: 'warning',
      message: 'Payment method does not support this checkout order type.',
      metadata: {
        orderType: checkoutOrder.orderType
      }
    });
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

  if (
    !supportsCheckoutPaymentMethodTargetType(
      resolved.method,
      checkoutOrder.targetType
    )
  ) {
    await logCheckoutPaymentAttempt({
      paymentMethodId: resolved.method.paymentMethodId,
      paymentMethod: resolved.method,
      checkoutOrder,
      source: 'checkout',
      eventType: 'start_blocked',
      status: 'warning',
      message: 'Payment method does not support this checkout target type.',
      metadata: {
        targetType: checkoutOrder.targetType
      }
    });
    await logCheckoutMethodTelemetry({
      eventType: 'checkout.method.start.blocked',
      action: 'start',
      status: 'warning',
      paymentMethodId: resolved.method.paymentMethodId,
      checkoutOrder,
      message: 'Payment method does not support checkout target type.',
      metadata: {
        targetType: checkoutOrder.targetType
      }
    });
    return {
      ok: false,
      statusCode: 400,
      error: 'Payment method does not support this checkout target type.'
    };
  }

  const reusedPendingStart = await resolveCheckoutProviderPendingStartReuse({
    paymentMethod: resolved.method,
    checkoutOrder
  });
  if (reusedPendingStart) {
    await logCheckoutPaymentAttempt({
      paymentMethodId: resolved.method.paymentMethodId,
      paymentMethod: resolved.method,
      checkoutOrder,
      source: 'checkout',
      eventType: 'reused_pending_start',
      status: 'info',
      providerSessionId: checkoutOrder.providerSessionId,
      message: 'Reused provider_pending checkout start.'
    });
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
    if (resolved.method.paymentMethodId === 'stripe') {
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

  await logCheckoutPaymentAttempt({
    paymentMethodId: resolved.method.paymentMethodId,
    paymentMethod: resolved.method,
    checkoutOrder,
    source: 'checkout',
    eventType: result.ok ? 'start_succeeded' : 'start_failed',
    status: result.ok ? 'success' : 'failed',
    message: result.ok
      ? 'Checkout payment method start executed.'
      : result.error,
    metadata: result.ok
      ? {
          checkoutStatus: result.status,
          hasRedirectUrl: Boolean(result.redirectUrl)
        }
      : {
          statusCode: result.statusCode
        }
  });

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

  await logCheckoutPaymentAttempt({
    paymentMethodId: resolved.method.paymentMethodId,
    paymentMethod: resolved.method,
    fallbackCheckoutToken,
    source,
    eventType: `${action}_received`,
    status: 'info',
    message: `Checkout payment method ${action} callback received.`
  });

  if (resolved.method.ownerType === 'core') {
    const coreResult = await executeCoreCheckoutPaymentMethodAction({
      paymentMethod: resolved.method,
      action,
      request,
      fallbackCheckoutToken,
      source
    });
    const coreCallbackObservation = coreResult.ok
      ? resolveCheckoutCallbackObservation({
          action,
          actionResult: coreResult.result,
          ownerType: 'core'
        })
      : null;

    await logCheckoutPaymentAttempt({
      paymentMethodId: resolved.method.paymentMethodId,
      paymentMethod: resolved.method,
      checkoutOrder: coreResult.ok ? coreResult.checkoutOrder ?? null : null,
      fallbackCheckoutToken,
      source,
      eventType:
        coreResult.ok && coreCallbackObservation
          ? coreCallbackObservation.attemptEventType
          : `${action}_failed`,
      status:
        coreResult.ok && coreCallbackObservation
          ? coreCallbackObservation.attemptStatus
          : 'failed',
      providerSessionId: coreResult.ok ? coreResult.result.providerSessionId ?? null : null,
      providerReferenceId: coreResult.ok
        ? coreResult.result.providerReferenceId ?? null
        : null,
      externalOrderId: coreResult.ok ? coreResult.result.externalOrderId ?? null : null,
      externalPaymentId: coreResult.ok
        ? coreResult.result.externalPaymentId ?? null
        : null,
      message: coreResult.ok
        ? coreCallbackObservation?.message ??
          `Core ${action} action executed for checkout payment method.`
        : coreResult.error,
      metadata: coreResult.ok
        ? coreCallbackObservation?.metadata ?? {
            actionStatus: coreResult.result.status
          }
        : {
            statusCode: coreResult.statusCode
          }
    });
    await logCheckoutMethodTelemetry({
      eventType:
        coreResult.ok && coreCallbackObservation
          ? coreCallbackObservation.telemetryEventType
          : 'checkout.method.callback.failed',
      action,
      status:
        coreResult.ok && coreCallbackObservation
          ? coreCallbackObservation.telemetryStatus
          : 'failed',
      paymentMethodId: resolved.method.paymentMethodId,
      checkoutOrder: coreResult.ok ? coreResult.checkoutOrder ?? null : null,
      fallbackCheckoutToken,
      message: coreResult.ok
        ? coreCallbackObservation?.message ??
          `Core ${action} action executed for checkout payment method.`
        : coreResult.error,
      metadata: coreResult.ok
        ? coreCallbackObservation?.metadata ?? {
            actionStatus: coreResult.result.status
          }
        : {
            statusCode: coreResult.statusCode
          }
    });
    return coreResult;
  }

  if (!resolved.method.moduleId) {
    await logCheckoutPaymentAttempt({
      paymentMethodId: resolved.method.paymentMethodId,
      paymentMethod: resolved.method,
      fallbackCheckoutToken,
      source,
      eventType: `${action}_failed`,
      status: 'failed',
      message: 'Module payment method is missing module owner information.'
    });
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
    await logCheckoutPaymentAttempt({
      paymentMethodId: resolved.method.paymentMethodId,
      paymentMethod: resolved.method,
      fallbackCheckoutToken,
      source,
      eventType: `${action}_failed`,
      status: 'failed',
      message: `Payment method ${action} route is not configured.`
    });
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
    await logCheckoutPaymentAttempt({
      paymentMethodId: resolved.method.paymentMethodId,
      paymentMethod: resolved.method,
      fallbackCheckoutToken,
      source,
      eventType: `${action}_failed`,
      status: 'failed',
      message: dispatchResponse.error,
      metadata: {
        statusCode: dispatchResponse.statusCode
      }
    });
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
      await logCheckoutPaymentAttempt({
        paymentMethodId: resolved.method.paymentMethodId,
        paymentMethod: resolved.method,
        checkoutOrder,
        fallbackCheckoutToken,
        source,
        eventType: `${action}_failed`,
        status: 'failed',
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

  const moduleCallbackObservation = resolveCheckoutCallbackObservation({
    action,
    actionResult: dispatchResponse.result,
    ownerType: 'module'
  });

  await logCheckoutMethodTelemetry({
    eventType: moduleCallbackObservation.telemetryEventType,
    action,
    status: moduleCallbackObservation.telemetryStatus,
    paymentMethodId: resolved.method.paymentMethodId,
    checkoutOrder,
    fallbackCheckoutToken,
    message: moduleCallbackObservation.message,
    metadata: moduleCallbackObservation.metadata
  });
  await logCheckoutPaymentAttempt({
    paymentMethodId: resolved.method.paymentMethodId,
    paymentMethod: resolved.method,
    checkoutOrder,
    fallbackCheckoutToken,
    source,
    eventType: moduleCallbackObservation.attemptEventType,
    status: moduleCallbackObservation.attemptStatus,
    providerSessionId: dispatchResponse.result.providerSessionId ?? null,
    providerReferenceId: dispatchResponse.result.providerReferenceId ?? null,
    externalOrderId: dispatchResponse.result.externalOrderId ?? null,
    externalPaymentId: dispatchResponse.result.externalPaymentId ?? null,
    message: moduleCallbackObservation.message,
    metadata: moduleCallbackObservation.metadata
  });

  return {
    ok: true,
    result: dispatchResponse.result,
    checkoutOrder
  } as const;
}

export const executeModuleCheckoutPaymentMethodAction =
  executeCheckoutPaymentMethodAction;
