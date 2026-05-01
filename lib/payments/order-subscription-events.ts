import { and, eq, isNull } from 'drizzle-orm';
import { subscriptionTemplates, teams, users } from '@/lib/db/schema';
import {
  recordLifecycleError,
  recordLifecycleSkipped,
} from '@/lib/observability/migration-metrics';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  mapOrderStatusToSubscriptionStatus,
  type PaymentOrderTargetType,
  type PaymentOrderType,
  type PaymentOrderSource,
  type PaymentOrderStatus
} from './orders';
import {
  activateSubscriptionAssignment,
  replaceWithDefaultTierSubscriptionAssignment,
  replaceWithReservedFreeSubscriptionAssignment,
  type ActivateSubscriptionAssignmentInput
} from './subscription-assignments';
import {
  consumeSubscriptionTrialUsage,
  normalizeSubscriptionCategoryKey,
  resolveSubscriptionTrialUsageTarget,
} from './subscription-policy';

const BILLING_PROVIDER_SET = new Set(['stripe', 'paypal'] as const);
const PAYMENT_ORDER_SUBSCRIPTION_LIFECYCLE_EVENT =
  'payments.order.subscription.lifecycle';

type BillingProvider = 'stripe' | 'paypal';
type LifecycleMode = 'activate' | 'suspend';
type LifecycleTargetType = 'team' | 'user';

type LifecycleTeam = {
  id: number;
  name: string;
};

type LifecycleUser = {
  id: number;
  email: string;
  deletedAt: Date | null;
};

type LifecycleTemplate = {
  id: number;
  name: string;
  targetScope: string;
  categoryKey: string;
  trialPeriodDays: number;
};

type AssignmentStatus = 'free' | 'trialing' | 'active' | 'unpaid' | 'canceled';

export type SubscriptionAssignmentReplayPayload =
  | {
      operation: 'activate';
      targetType: LifecycleTargetType;
      targetId: number;
      subscriptionTemplateId: number;
      paymentProvider: string | null;
      providerReferenceId: string | null;
      providerPlanId: string | null;
      status: AssignmentStatus;
      planName: string | null;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      trialEndsAt?: Date | null;
      cancelAtPeriodEnd?: boolean | null;
      canceledAt?: Date | null;
      sourceOrderId: number | null;
    }
  | {
      operation: 'suspend';
      targetType: LifecycleTargetType;
      targetId: number;
      status: 'unpaid' | 'canceled';
      sourceOrderId: number | null;
    };

export type RunPaymentOrderSubscriptionLifecycleInput = {
  orderId?: number | null;
  orderType?: PaymentOrderType | string | null;
  provider?: string | null;
  status: PaymentOrderStatus;
  eventType?: string | null;
  orderSource?: PaymentOrderSource | string | null;
  triggerSource?: string | null;
  teamId?: number | null;
  targetType?: PaymentOrderTargetType | string | null;
  targetTeamId?: number | null;
  targetUserId?: number | null;
  subscriptionTemplateId?: number | null;
  planName?: string | null;
  providerPlanId?: string | null;
  externalPaymentId?: string | null;
  metadata?: unknown;
  actorUserId?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
};

export type PaymentOrderSubscriptionLifecycleResult = {
  applied: boolean;
  targetType: LifecycleTargetType | null;
  mode: LifecycleMode | null;
  reason: string;
};

type PaymentOrderSubscriptionLifecycleDeps = {
  getTeam: (teamId: number) => Promise<LifecycleTeam | null>;
  getUser: (userId: number) => Promise<LifecycleUser | null>;
  getTemplate: (templateId: number) => Promise<LifecycleTemplate | null>;
  activateSubscriptionAssignment?: (
    input: ActivateSubscriptionAssignmentInput
  ) => Promise<unknown>;
  replaceWithReservedFreeSubscriptionAssignment?: (
    input: {
      targetType: 'team' | 'user';
      targetId: number;
      closeStatus?: 'unpaid' | 'canceled';
      sourceOrderId?: number | null;
    }
  ) => Promise<unknown>;
  replaceWithFallbackSubscriptionAssignment?: (
    input: {
      targetType: 'team' | 'user';
      targetId: number;
      closeStatus?: 'unpaid' | 'canceled';
      sourceOrderId?: number | null;
    }
  ) => Promise<unknown>;
  consumeSubscriptionTrialUsage?: typeof consumeSubscriptionTrialUsage;
  createSysActivityLog: typeof createSysActivityLog;
  emitEventAsync?: typeof emitEventAsync;
};

async function getLifecycleDb() {
  const { db } = await import('@/lib/db/drizzle');
  return db;
}

const DEFAULT_PAYMENT_ORDER_SUBSCRIPTION_LIFECYCLE_DEPS: PaymentOrderSubscriptionLifecycleDeps =
  {
    async getTeam(teamId) {
      const db = await getLifecycleDb();
      const [team] = await db
        .select({
          id: teams.id,
          name: teams.name
        })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      return team || null;
    },
    async getUser(userId) {
      const db = await getLifecycleDb();
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          deletedAt: users.deletedAt
        })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      return user || null;
    },
    async getTemplate(templateId) {
      const db = await getLifecycleDb();
      const [template] = await db
        .select({
          id: subscriptionTemplates.id,
          name: subscriptionTemplates.name,
          targetScope: subscriptionTemplates.targetScope,
          categoryKey: subscriptionTemplates.categoryKey,
          trialPeriodDays: subscriptionTemplates.trialPeriodDays
        })
        .from(subscriptionTemplates)
        .where(eq(subscriptionTemplates.id, templateId))
        .limit(1);

      return template || null;
    },
    activateSubscriptionAssignment,
    replaceWithFallbackSubscriptionAssignment:
      replaceWithDefaultTierSubscriptionAssignment,
    replaceWithReservedFreeSubscriptionAssignment,
    consumeSubscriptionTrialUsage,
    createSysActivityLog,
    emitEventAsync
  };

function normalizePositiveInt(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  return null;
}

function normalizeText(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseOrderMetadata(metadata: unknown) {
  if (metadata === null || metadata === undefined) {
    return null;
  }

  if (typeof metadata === 'string') {
    try {
      return asRecord(JSON.parse(metadata));
    } catch {
      return null;
    }
  }

  return asRecord(metadata);
}

function getLifecycleMode(status: PaymentOrderStatus): LifecycleMode | null {
  if (status === 'received') {
    return 'activate';
  }

  if (status === 'canceled' || status === 'failed') {
    return 'suspend';
  }

  return null;
}

function normalizeTargetType(value: unknown): LifecycleTargetType | null {
  const normalized = normalizeText(value, 20)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'organization') {
    return 'team';
  }

  if (normalized === 'team' || normalized === 'user') {
    return normalized;
  }

  return null;
}

function normalizeBillingProvider(value: unknown): BillingProvider | null {
  const normalized = normalizeText(value, 20)?.toLowerCase();
  if (!normalized || !BILLING_PROVIDER_SET.has(normalized as BillingProvider)) {
    return null;
  }

  return normalized as BillingProvider;
}

function normalizeOrderType(value: unknown): PaymentOrderType | null {
  const normalized = normalizeText(value, 20)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'subscription' || normalized === 'one_time') {
    return normalized;
  }

  return null;
}

function normalizeAssignmentStatus(value: unknown): AssignmentStatus {
  const normalized = normalizeText(value, 20)?.toLowerCase();
  if (
    normalized === 'free' ||
    normalized === 'trialing' ||
    normalized === 'active' ||
    normalized === 'unpaid' ||
    normalized === 'canceled'
  ) {
    return normalized;
  }

  return 'active';
}

function normalizeProviderAssignmentStatus(value: unknown): AssignmentStatus | null {
  const normalized = normalizeText(value, 20)?.toLowerCase();
  if (
    normalized === 'free' ||
    normalized === 'trialing' ||
    normalized === 'active' ||
    normalized === 'unpaid' ||
    normalized === 'canceled'
  ) {
    return normalized;
  }

  return null;
}

function normalizeSuspendAssignmentStatus(value: unknown): 'unpaid' | 'canceled' {
  const normalized = normalizeAssignmentStatus(value);
  if (normalized === 'unpaid' || normalized === 'canceled') {
    return normalized;
  }

  return 'canceled';
}

export async function applySubscriptionAssignmentReplayPayload(
  payload: SubscriptionAssignmentReplayPayload
) {
  if (payload.operation === 'activate') {
    return activateSubscriptionAssignment({
      targetType: payload.targetType,
      targetId: payload.targetId,
      subscriptionTemplateId: payload.subscriptionTemplateId,
      paymentProvider: payload.paymentProvider,
      providerReferenceId: payload.providerReferenceId,
      providerPlanId: payload.providerPlanId,
      status: payload.status,
      planName: payload.planName,
      currentPeriodStart: payload.currentPeriodStart ?? null,
      currentPeriodEnd: payload.currentPeriodEnd ?? null,
      trialEndsAt: payload.trialEndsAt ?? null,
      cancelAtPeriodEnd: payload.cancelAtPeriodEnd ?? null,
      canceledAt: payload.canceledAt ?? null,
      sourceOrderId: payload.sourceOrderId,
    });
  }

  return replaceWithDefaultTierSubscriptionAssignment({
    targetType: payload.targetType,
    targetId: payload.targetId,
    closeStatus: payload.status,
    sourceOrderId: payload.sourceOrderId,
  });
}

function resolveMetadataContext(metadata: Record<string, unknown> | null) {
  const checkoutContext = asRecord(metadata?.checkoutContext);
  const providerMetadata = asRecord(checkoutContext?.providerMetadata);
  const systemProviderMetadata = asRecord(providerMetadata?.system);
  const stripeProviderMetadata = asRecord(providerMetadata?.stripe);
  const paypalProviderMetadata = asRecord(providerMetadata?.paypal);

  return {
    checkoutContext,
    systemProviderMetadata,
    stripeProviderMetadata,
    paypalProviderMetadata
  };
}

function resolveSubscriptionChange(
  metadata: Record<string, unknown> | null
) {
  const change = asRecord(metadata?.subscriptionChange);
  return {
    mode: normalizeText(change?.mode, 30)?.toLowerCase(),
    requestId: normalizePositiveInt(change?.requestId),
    effectiveAt: normalizeText(change?.effectiveAt, 60)
  };
}

function parseMetadataDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000;
    const parsed = new Date(millis);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }

  return null;
}

function parseMetadataBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return null;
}

function resolveCheckoutOrderSubscriptionMetadata(
  metadata: Record<string, unknown> | null
) {
  const checkoutOrderSubscription = asRecord(metadata?.checkoutOrderSubscription);
  return {
    trialEligible: parseMetadataBoolean(checkoutOrderSubscription?.trialEligible),
    categoryKey: normalizeSubscriptionCategoryKey(
      normalizeText(checkoutOrderSubscription?.categoryKey, 120)
    )
  };
}

function resolvePeriodMetadata({
  stripeProviderMetadata,
  paypalProviderMetadata,
  systemProviderMetadata
}: {
  stripeProviderMetadata: Record<string, unknown> | null;
  paypalProviderMetadata: Record<string, unknown> | null;
  systemProviderMetadata: Record<string, unknown> | null;
}) {
  const source = stripeProviderMetadata ?? paypalProviderMetadata ?? systemProviderMetadata;
  if (!source) {
    return {
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: null,
      canceledAt: null
    };
  }

  return {
    currentPeriodStart: parseMetadataDate(source.currentPeriodStart),
    currentPeriodEnd: parseMetadataDate(source.currentPeriodEnd),
    trialEndsAt: parseMetadataDate(source.trialEndsAt),
    cancelAtPeriodEnd: parseMetadataBoolean(source.cancelAtPeriodEnd),
    canceledAt: parseMetadataDate(source.canceledAt)
  };
}

function resolveActivationAssignmentStatus({
  orderStatus,
  metadata,
  stripeProviderMetadata,
  paypalProviderMetadata,
  systemProviderMetadata
}: {
  orderStatus: PaymentOrderStatus;
  metadata: Record<string, unknown> | null;
  stripeProviderMetadata: Record<string, unknown> | null;
  paypalProviderMetadata: Record<string, unknown> | null;
  systemProviderMetadata: Record<string, unknown> | null;
}) {
  const providerStatus =
    normalizeProviderAssignmentStatus(metadata?.subscriptionStatus) ??
    normalizeProviderAssignmentStatus(stripeProviderMetadata?.subscriptionStatus) ??
    normalizeProviderAssignmentStatus(paypalProviderMetadata?.subscriptionStatus) ??
    normalizeProviderAssignmentStatus(systemProviderMetadata?.subscriptionStatus);

  if (
    providerStatus === 'free' ||
    providerStatus === 'trialing' ||
    providerStatus === 'active'
  ) {
    return providerStatus;
  }

  return normalizeAssignmentStatus(mapOrderStatusToSubscriptionStatus(orderStatus));
}

function resolveTarget({
  inputTargetType,
  inputTargetTeamId,
  inputTargetUserId,
  orderTeamId
}: {
  inputTargetType: LifecycleTargetType | null;
  inputTargetTeamId: number | null;
  inputTargetUserId: number | null;
  orderTeamId: number | null;
}) {
  if (inputTargetType === 'user') {
    return inputTargetUserId
      ? {
          targetType: 'user' as const,
          targetId: inputTargetUserId
        }
      : null;
  }

  if (inputTargetType === 'team') {
    const resolvedTeamId = inputTargetTeamId ?? orderTeamId;
    return resolvedTeamId
      ? {
          targetType: 'team' as const,
          targetId: resolvedTeamId
        }
      : null;
  }

  if (inputTargetUserId) {
    return {
      targetType: 'user' as const,
      targetId: inputTargetUserId
    };
  }

  const resolvedTeamId = inputTargetTeamId ?? orderTeamId;
  if (resolvedTeamId) {
    return {
      targetType: 'team' as const,
      targetId: resolvedTeamId
    };
  }

  return null;
}

type TrialLifecycleConsumptionResult = {
  attempted: boolean;
  consumed: boolean;
  categoryKey: string | null;
  reason:
    | 'inserted'
    | 'already_consumed'
    | 'not_applicable'
    | 'invalid_target'
    | 'invalid_category';
};

async function consumeLifecycleTrialUsage({
  deps,
  metadata,
  template,
  targetType,
  targetId,
  orderId
}: {
  deps: PaymentOrderSubscriptionLifecycleDeps;
  metadata: Record<string, unknown> | null;
  template: LifecycleTemplate;
  targetType: LifecycleTargetType;
  targetId: number;
  orderId: number | null;
}): Promise<TrialLifecycleConsumptionResult> {
  const checkoutOrderSubscription = resolveCheckoutOrderSubscriptionMetadata(metadata);
  const trialEligible =
    checkoutOrderSubscription.trialEligible ?? (template.trialPeriodDays > 0);
  if (!trialEligible || template.trialPeriodDays <= 0) {
    return {
      attempted: false,
      consumed: false,
      categoryKey: normalizeSubscriptionCategoryKey(template.categoryKey, template.id),
      reason: 'not_applicable'
    };
  }

  const trialTarget = resolveSubscriptionTrialUsageTarget({
    targetType,
    targetId
  });
  const consumeTrialUsageWriter =
    deps.consumeSubscriptionTrialUsage ?? consumeSubscriptionTrialUsage;
  const consumeResult = await consumeTrialUsageWriter({
    template: {
      id: template.id,
      categoryKey:
        checkoutOrderSubscription.categoryKey ?? template.categoryKey,
      trialPeriodDays: template.trialPeriodDays
    },
    target: trialTarget,
    firstOrderId: orderId
  });

  const attempted =
    consumeResult.reason === 'inserted' ||
    consumeResult.reason === 'already_consumed';

  return {
    attempted,
    consumed: consumeResult.consumed,
    categoryKey: consumeResult.categoryKey,
    reason: consumeResult.reason
  };
}

type LifecycleLogContext = {
  orderId: number | null;
  orderType: PaymentOrderType | null;
  externalPaymentId: string | null;
  provider: string | null;
  status: PaymentOrderStatus;
  eventType: string | null;
  orderSource: string | null;
  triggerSource: string | null;
  mode: LifecycleMode | null;
  targetType: LifecycleTargetType | null;
  targetId: number | null;
  templateId: number | null;
  actorUserId: number | null;
  actorEmail: string | null;
  actorRole: string | null;
  reason: string;
};

async function logLifecycleEvent(
  deps: PaymentOrderSubscriptionLifecycleDeps,
  context: LifecycleLogContext,
  logStatus: 'success' | 'warning' | 'failed',
  message: string
) {
  await deps.createSysActivityLog({
    eventType: PAYMENT_ORDER_SUBSCRIPTION_LIFECYCLE_EVENT,
    eventCategory: 'payments',
    action: 'event',
    status: logStatus,
    actorUserId: context.actorUserId,
    actorEmail: context.actorEmail,
    actorRole: context.actorRole,
    targetUserId: context.targetType === 'user' ? context.targetId : null,
    teamId: context.targetType === 'team' ? context.targetId : null,
    entityType: 'payment_order',
    entityId:
      context.orderId !== null
        ? String(context.orderId)
        : context.externalPaymentId,
    source:
      context.triggerSource || '/lib/payments/order-subscription-events',
    message,
    metadata: {
      reason: context.reason,
      orderType: context.orderType,
      mode: context.mode,
      provider: context.provider,
      status: context.status,
      eventType: context.eventType,
      orderSource: context.orderSource,
      targetType: context.targetType,
      targetId: context.targetId,
      templateId: context.templateId
    }
  });
}

async function projectSubscriptionAssignment({
  deps,
  payload,
}: {
  deps: PaymentOrderSubscriptionLifecycleDeps;
  payload: SubscriptionAssignmentReplayPayload;
}) {
  const activateWriter =
    deps.activateSubscriptionAssignment ?? activateSubscriptionAssignment;
  const fallbackWriter =
    deps.replaceWithFallbackSubscriptionAssignment ??
    replaceWithDefaultTierSubscriptionAssignment;
  const freeFallbackWriter =
    deps.replaceWithReservedFreeSubscriptionAssignment ??
    replaceWithReservedFreeSubscriptionAssignment;

  if (payload.operation === 'activate') {
    await activateWriter({
      targetType: payload.targetType,
      targetId: payload.targetId,
      subscriptionTemplateId: payload.subscriptionTemplateId,
      paymentProvider: payload.paymentProvider,
      providerReferenceId: payload.providerReferenceId,
      providerPlanId: payload.providerPlanId,
      status: payload.status,
      planName: payload.planName,
      currentPeriodStart: payload.currentPeriodStart ?? null,
      currentPeriodEnd: payload.currentPeriodEnd ?? null,
      trialEndsAt: payload.trialEndsAt ?? null,
      cancelAtPeriodEnd: payload.cancelAtPeriodEnd ?? null,
      canceledAt: payload.canceledAt ?? null,
      sourceOrderId: payload.sourceOrderId,
    });
    return;
  }

  if (fallbackWriter) {
    await fallbackWriter({
      targetType: payload.targetType,
      targetId: payload.targetId,
      closeStatus: payload.status,
      sourceOrderId: payload.sourceOrderId,
    });
    return;
  }

  await freeFallbackWriter({
    targetType: payload.targetType,
    targetId: payload.targetId,
    closeStatus: payload.status,
    sourceOrderId: payload.sourceOrderId,
  });
}

export async function runPaymentOrderSubscriptionLifecycle(
  input: RunPaymentOrderSubscriptionLifecycleInput,
  deps: PaymentOrderSubscriptionLifecycleDeps =
    DEFAULT_PAYMENT_ORDER_SUBSCRIPTION_LIFECYCLE_DEPS
): Promise<PaymentOrderSubscriptionLifecycleResult> {
  const emitAsync = deps.emitEventAsync ?? emitEventAsync;
  const mode = getLifecycleMode(input.status);
  if (!mode) {
    recordLifecycleSkipped('status_not_actionable', {
      status: input.status,
      provider: input.provider ?? null,
      orderId: input.orderId ?? null,
    });
    return {
      applied: false,
      targetType: null,
      mode: null,
      reason: 'status_not_actionable'
    };
  }

  const normalizedOrderType = normalizeOrderType(input.orderType);
  if (normalizedOrderType && normalizedOrderType !== 'subscription') {
    recordLifecycleSkipped('order_type_not_subscription', {
      orderType: normalizedOrderType,
      provider: input.provider ?? null,
      orderId: input.orderId ?? null,
    });

    return {
      applied: false,
      targetType: null,
      mode,
      reason: 'order_type_not_subscription'
    };
  }

  const metadata = parseOrderMetadata(input.metadata);
  const subscriptionChange = resolveSubscriptionChange(metadata);
  const orderTeamId = normalizePositiveInt(input.teamId);
  const inputTargetType = normalizeTargetType(input.targetType);
  const inputTargetTeamId = normalizePositiveInt(input.targetTeamId);
  const inputTargetUserId = normalizePositiveInt(input.targetUserId);
  const orderId = normalizePositiveInt(input.orderId);
  const normalizedProvider = normalizeText(input.provider, 30);
  const normalizedEventType = normalizeText(input.eventType, 120);
  const normalizedOrderSource = normalizeText(input.orderSource, 30);
  const normalizedTriggerSource = normalizeText(input.triggerSource, 120);
  const normalizedExternalPaymentId = normalizeText(input.externalPaymentId, 255);
  const normalizedPlanName = normalizeText(input.planName, 100);
  const normalizedProviderPlanId = normalizeText(input.providerPlanId, 255);
  const actorUserId = normalizePositiveInt(input.actorUserId);
  const actorEmail = normalizeText(input.actorEmail, 255);
  const actorRole = normalizeText(input.actorRole, 30);

  const {
    checkoutContext,
    systemProviderMetadata,
    stripeProviderMetadata,
    paypalProviderMetadata
  } =
    resolveMetadataContext(metadata);

  const periodMetadata = resolvePeriodMetadata({
    stripeProviderMetadata,
    paypalProviderMetadata,
    systemProviderMetadata
  });

  const target = resolveTarget({
    inputTargetType,
    inputTargetTeamId,
    inputTargetUserId,
    orderTeamId
  });

  const templateId = normalizePositiveInt(input.subscriptionTemplateId);
  const template = templateId ? await deps.getTemplate(templateId) : null;

  const contextBase: LifecycleLogContext = {
    orderId,
    orderType: normalizedOrderType,
    externalPaymentId: normalizedExternalPaymentId,
    provider: normalizedProvider,
    status: input.status,
    eventType:
      normalizedEventType ||
      normalizeText(checkoutContext?.eventType, 120),
    orderSource:
      normalizedOrderSource ||
      normalizeText(checkoutContext?.source, 30),
    triggerSource: normalizedTriggerSource,
    mode,
    targetType: target?.targetType ?? null,
    targetId: target?.targetId ?? null,
    templateId: template?.id ?? templateId ?? null,
    actorUserId,
    actorEmail,
    actorRole,
    reason: ''
  };

  if (mode === 'activate' && !template) {
    await logLifecycleEvent(
      deps,
      {
        ...contextBase,
        reason: 'template_not_found'
      },
      'warning',
      'Order lifecycle activation skipped because template could not be resolved.'
    );
    recordLifecycleSkipped('template_not_found', {
      mode,
      targetType: target?.targetType ?? null,
      targetId: target?.targetId ?? null,
      templateId,
      orderId,
    });
    return {
      applied: false,
      targetType: target?.targetType ?? null,
      mode,
      reason: 'template_not_found'
    };
  }

  if (!target) {
    await logLifecycleEvent(
      deps,
      {
        ...contextBase,
        reason: 'target_not_resolved'
      },
      'warning',
      'Order lifecycle event skipped because no subscription target was resolved.'
    );
    recordLifecycleSkipped('target_not_resolved', {
      mode,
      orderId,
      provider: normalizedProvider,
    });
    return {
      applied: false,
      targetType: null,
      mode,
      reason: 'target_not_resolved'
    };
  }

  if (
    mode === 'activate' &&
    subscriptionChange.mode === 'period_end' &&
    subscriptionChange.requestId
  ) {
    await logLifecycleEvent(
      deps,
      {
        ...contextBase,
        reason: 'change_scheduled'
      },
      'warning',
      'Order lifecycle activation skipped because a period-end change request is scheduled.'
    );
    recordLifecycleSkipped('change_scheduled', {
      mode,
      targetType: target.targetType,
      targetId: target.targetId,
      templateId: template?.id ?? templateId ?? null,
      orderId,
      changeRequestId: subscriptionChange.requestId
    });
    return {
      applied: false,
      targetType: target.targetType,
      mode,
      reason: 'change_scheduled'
    };
  }

  try {
    if (target.targetType === 'team') {
      const team = await deps.getTeam(target.targetId);
      if (!team) {
        await logLifecycleEvent(
          deps,
          {
            ...contextBase,
            reason: 'team_not_found'
          },
          'warning',
          'Order lifecycle event skipped because target organization was not found.'
        );
        recordLifecycleSkipped('team_not_found', {
          mode,
          targetType: 'team',
          targetId: target.targetId,
          orderId,
        });
        return {
          applied: false,
          targetType: 'team',
          mode,
          reason: 'team_not_found'
        };
      }

      if (mode === 'suspend') {
        await projectSubscriptionAssignment({
          deps,
          payload: {
            operation: 'suspend',
            targetType: 'team',
            targetId: team.id,
            status: normalizeSuspendAssignmentStatus(
              mapOrderStatusToSubscriptionStatus(input.status)
            ),
            sourceOrderId: orderId
          }
        });

        await logLifecycleEvent(
          deps,
          {
            ...contextBase,
            reason: 'team_suspended'
          },
          'success',
          'Order lifecycle event suspended organization subscription and reverted template access.'
        );
        await emitAsync(
          EVENT_HOOKS.paymentOrderLifecycleApplied,
          {
            orderId,
            targetType: 'team',
            targetId: team.id,
            mode,
            reason: 'team_suspended'
          },
          { source: '/lib/payments/order-subscription-events' }
        );
        return {
          applied: true,
          targetType: 'team',
          mode,
          reason: 'team_suspended'
        };
      }

      if (template && template.targetScope !== 'organization') {
        await logLifecycleEvent(
          deps,
          {
            ...contextBase,
            reason: 'template_scope_mismatch'
          },
          'warning',
          'Order lifecycle activation skipped because template scope is not organization.'
        );
        recordLifecycleSkipped('template_scope_mismatch', {
          mode,
          targetType: 'team',
          targetId: target.targetId,
          templateId: template.id,
          templateScope: template.targetScope,
          orderId,
        });
        return {
          applied: false,
          targetType: 'team',
          mode,
          reason: 'template_scope_mismatch'
        };
      }

      const providerFromMetadata = normalizeBillingProvider(
        systemProviderMetadata?.paymentProvider
      );
      const provider = normalizeBillingProvider(input.provider) || providerFromMetadata;
      let trialUsageResult: TrialLifecycleConsumptionResult | null = null;
      if (template?.id) {
        await projectSubscriptionAssignment({
          deps,
          payload: {
            operation: 'activate',
            targetType: 'team',
            targetId: team.id,
            subscriptionTemplateId: template.id,
            paymentProvider: provider ?? null,
            providerReferenceId: normalizedExternalPaymentId,
            providerPlanId: normalizedProviderPlanId,
            status: resolveActivationAssignmentStatus({
              orderStatus: input.status,
              metadata,
              stripeProviderMetadata,
              paypalProviderMetadata,
              systemProviderMetadata
            }),
            planName: normalizedPlanName || template?.name || 'Subscription',
            currentPeriodStart: periodMetadata.currentPeriodStart,
            currentPeriodEnd: periodMetadata.currentPeriodEnd,
            trialEndsAt: periodMetadata.trialEndsAt,
            cancelAtPeriodEnd: periodMetadata.cancelAtPeriodEnd,
            canceledAt: periodMetadata.canceledAt,
            sourceOrderId: orderId
          }
        });

        trialUsageResult = await consumeLifecycleTrialUsage({
          deps,
          metadata,
          template,
          targetType: 'team',
          targetId: team.id,
          orderId
        });
      }

      if (trialUsageResult?.attempted) {
        await logLifecycleEvent(
          deps,
          {
            ...contextBase,
            reason: trialUsageResult.consumed
              ? 'trial_consumed'
              : 'trial_reuse_blocked'
          },
          trialUsageResult.consumed ? 'success' : 'warning',
          trialUsageResult.consumed
            ? 'Order lifecycle consumed trial usage for subscription category.'
            : 'Order lifecycle detected prior trial usage for subscription category.'
        );
      }

      await logLifecycleEvent(
        deps,
        {
          ...contextBase,
          reason: 'team_activated'
        },
        'success',
        'Order lifecycle event activated organization subscription.'
      );
      await emitAsync(
        EVENT_HOOKS.paymentOrderLifecycleApplied,
        {
          orderId,
          targetType: 'team',
          targetId: team.id,
          mode,
          reason: 'team_activated'
        },
        { source: '/lib/payments/order-subscription-events' }
      );
      return {
        applied: true,
        targetType: 'team',
        mode,
        reason: 'team_activated'
      };
    }

    const targetUser = await deps.getUser(target.targetId);
    if (!targetUser || targetUser.deletedAt) {
      await logLifecycleEvent(
        deps,
        {
          ...contextBase,
          reason: 'user_not_found'
        },
        'warning',
        'Order lifecycle event skipped because target user was not found.'
      );
      recordLifecycleSkipped('user_not_found', {
        mode,
        targetType: 'user',
        targetId: target.targetId,
        orderId,
      });
      return {
        applied: false,
        targetType: 'user',
        mode,
        reason: 'user_not_found'
      };
    }

    if (mode === 'suspend') {
      await projectSubscriptionAssignment({
        deps,
        payload: {
          operation: 'suspend',
          targetType: 'user',
          targetId: targetUser.id,
          status: normalizeSuspendAssignmentStatus(
            mapOrderStatusToSubscriptionStatus(input.status)
          ),
          sourceOrderId: orderId
        }
      });

      await logLifecycleEvent(
        deps,
        {
          ...contextBase,
          reason: 'user_suspended'
        },
        'success',
        'Order lifecycle event suspended user subscription and reverted template access.'
      );
      await emitAsync(
        EVENT_HOOKS.paymentOrderLifecycleApplied,
        {
          orderId,
          targetType: 'user',
          targetId: targetUser.id,
          mode,
          reason: 'user_suspended'
        },
        { source: '/lib/payments/order-subscription-events' }
      );
      return {
        applied: true,
        targetType: 'user',
        mode,
        reason: 'user_suspended'
      };
    }

    if (!template) {
      await logLifecycleEvent(
        deps,
        {
          ...contextBase,
          reason: 'template_not_found'
        },
        'warning',
        'Order lifecycle activation skipped because template could not be resolved.'
      );
      recordLifecycleSkipped('template_not_found', {
        mode,
        targetType: 'user',
        targetId: target.targetId,
        templateId,
        orderId,
      });
      return {
        applied: false,
        targetType: 'user',
        mode,
        reason: 'template_not_found'
      };
    }

    if (template.targetScope !== 'user') {
      await logLifecycleEvent(
        deps,
        {
          ...contextBase,
          reason: 'template_scope_mismatch'
        },
        'warning',
        'Order lifecycle activation skipped because template scope is not user.'
      );
      recordLifecycleSkipped('template_scope_mismatch', {
        mode,
        targetType: 'user',
        targetId: target.targetId,
        templateId: template.id,
        templateScope: template.targetScope,
        orderId,
      });
      return {
        applied: false,
        targetType: 'user',
        mode,
        reason: 'template_scope_mismatch'
      };
    }

    await projectSubscriptionAssignment({
      deps,
      payload: {
        operation: 'activate',
        targetType: 'user',
        targetId: targetUser.id,
        subscriptionTemplateId: template.id,
        paymentProvider: normalizeBillingProvider(input.provider),
        providerReferenceId: normalizedExternalPaymentId,
        providerPlanId: normalizedProviderPlanId,
        status: resolveActivationAssignmentStatus({
          orderStatus: input.status,
          metadata,
          stripeProviderMetadata,
          paypalProviderMetadata,
          systemProviderMetadata
        }),
        planName: normalizedPlanName || template.name || null,
        currentPeriodStart: periodMetadata.currentPeriodStart,
        currentPeriodEnd: periodMetadata.currentPeriodEnd,
        trialEndsAt: periodMetadata.trialEndsAt,
        cancelAtPeriodEnd: periodMetadata.cancelAtPeriodEnd,
        canceledAt: periodMetadata.canceledAt,
        sourceOrderId: orderId
      }
    });

    const trialUsageResult = await consumeLifecycleTrialUsage({
      deps,
      metadata,
      template,
      targetType: 'user',
      targetId: targetUser.id,
      orderId
    });
    if (trialUsageResult.attempted) {
      await logLifecycleEvent(
        deps,
        {
          ...contextBase,
          reason: trialUsageResult.consumed
            ? 'trial_consumed'
            : 'trial_reuse_blocked'
        },
        trialUsageResult.consumed ? 'success' : 'warning',
        trialUsageResult.consumed
          ? 'Order lifecycle consumed trial usage for subscription category.'
          : 'Order lifecycle detected prior trial usage for subscription category.'
      );
    }

    await logLifecycleEvent(
      deps,
      {
        ...contextBase,
        reason: 'user_activated'
      },
      'success',
      'Order lifecycle event activated user subscription.'
    );
    await emitAsync(
      EVENT_HOOKS.paymentOrderLifecycleApplied,
      {
        orderId,
        targetType: 'user',
        targetId: targetUser.id,
        mode,
        reason: 'user_activated'
      },
      { source: '/lib/payments/order-subscription-events' }
    );
    return {
      applied: true,
      targetType: 'user',
      mode,
      reason: 'user_activated'
    };
  } catch (error) {
    recordLifecycleError('unexpected_error', {
      mode,
      orderId,
      provider: normalizedProvider,
      targetType: target?.targetType ?? null,
      targetId: target?.targetId ?? null,
    });

    try {
      await logLifecycleEvent(
        deps,
        {
          ...contextBase,
          reason: 'unexpected_error'
        },
        'failed',
        'Order lifecycle event failed while applying subscription changes.'
      );
    } catch {
      // Ignore nested logging failures to preserve original error context.
    }

    throw error;
  }
}
