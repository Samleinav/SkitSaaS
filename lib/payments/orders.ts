import { db } from '@/lib/db/drizzle';
import { paymentOrders } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export type PaymentOrderStatus =
  | 'pending'
  | 'received'
  | 'canceled'
  | 'failed';

export type PaymentOrderType = 'subscription' | 'one_time';

export type PaymentOrderTargetType = 'team' | 'user';

export type PaymentOrderSource =
  | 'checkout'
  | 'webhook'
  | 'dashboard'
  | 'system';

type UpsertPaymentOrderInput = {
  provider: string;
  orderType: PaymentOrderType;
  moduleId?: string | null;
  status?: PaymentOrderStatus;
  eventType: string;
  source?: PaymentOrderSource;
  teamId?: number | null;
  targetType?: PaymentOrderTargetType | null;
  targetTeamId?: number | null;
  targetUserId?: number | null;
  subscriptionTemplateId?: number | null;
  paymentMethod?: string | null;
  planName?: string | null;
  providerPlanId?: string | null;
  externalOrderId?: string | null;
  externalPaymentId?: string | null;
  amount?: number | null;
  currency?: string | null;
  message?: string | null;
  metadata?: unknown;
};

export type UpsertPaymentOrderResult = {
  id: number;
  provider: string;
  orderType: PaymentOrderType;
  moduleId: string | null;
  status: PaymentOrderStatus;
  eventType: string;
  source: PaymentOrderSource;
  teamId: number | null;
  targetType: PaymentOrderTargetType | null;
  targetTeamId: number | null;
  targetUserId: number | null;
  subscriptionTemplateId: number | null;
  paymentMethod: string | null;
  planName: string | null;
  providerPlanId: string | null;
  externalOrderId: string | null;
  externalPaymentId: string | null;
  amount: number | null;
  currency: string | null;
  message: string | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeText(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizePositiveInt(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeAmount(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value);
}

function normalizeMetadata(metadata: unknown) {
  if (metadata === undefined) {
    return null;
  }

  try {
    return JSON.stringify(metadata).slice(0, 12000);
  } catch {
    return null;
  }
}

function normalizeStatus(
  status: PaymentOrderStatus | null | undefined
): PaymentOrderStatus {
  if (
    status === 'pending' ||
    status === 'received' ||
    status === 'canceled' ||
    status === 'failed'
  ) {
    return status;
  }

  return 'pending';
}

function normalizeSource(
  source: PaymentOrderSource | null | undefined
): PaymentOrderSource {
  if (
    source === 'checkout' ||
    source === 'webhook' ||
    source === 'dashboard' ||
    source === 'system'
  ) {
    return source;
  }

  return 'system';
}

function normalizeOrderType(
  orderType: PaymentOrderType | null | undefined
): PaymentOrderType | null {
  if (orderType === 'subscription' || orderType === 'one_time') {
    return orderType;
  }

  return null;
}

function normalizeTargetType(
  targetType: PaymentOrderTargetType | null | undefined
): PaymentOrderTargetType | null {
  if (targetType === 'team' || targetType === 'user') {
    return targetType;
  }

  return null;
}

export function mapSubscriptionStatusToOrderStatus(
  subscriptionStatus: string | null | undefined
): PaymentOrderStatus {
  const normalized = (subscriptionStatus || '').toLowerCase();

  if (normalized === 'active') {
    return 'received';
  }

  if (normalized === 'trialing') {
    return 'received';
  }

  if (normalized === 'canceled') {
    return 'canceled';
  }

  if (normalized === 'unpaid') {
    return 'failed';
  }

  return 'pending';
}

export function mapOrderStatusToSubscriptionStatus(status: PaymentOrderStatus) {
  if (status === 'received') {
    return 'active';
  }

  if (status === 'failed') {
    return 'unpaid';
  }

  if (status === 'canceled') {
    return 'canceled';
  }

  return 'trialing';
}

export async function upsertPaymentOrder({
  provider,
  orderType,
  moduleId = null,
  status = 'pending',
  eventType,
  source = 'system',
  teamId = null,
  targetType = null,
  targetTeamId = null,
  targetUserId = null,
  subscriptionTemplateId = null,
  paymentMethod = null,
  planName = null,
  providerPlanId = null,
  externalOrderId = null,
  externalPaymentId = null,
  amount = null,
  currency = null,
  message = null,
  metadata
}: UpsertPaymentOrderInput): Promise<UpsertPaymentOrderResult | null> {
  const safeProvider = normalizeText(provider, 30);
  const safeEventType = normalizeText(eventType, 120);
  const safeExternalPaymentId = normalizeText(externalPaymentId, 255);
  const safeExternalOrderId = normalizeText(externalOrderId, 255);

  if (!safeProvider || !safeEventType) {
    return null;
  }

  const normalizedOrderType = normalizeOrderType(orderType);
  if (!normalizedOrderType) {
    return null;
  }

  const normalizedTeamId = normalizePositiveInt(teamId);
  const normalizedTargetType = normalizeTargetType(targetType);
  const normalizedTargetTeamId = normalizePositiveInt(
    targetTeamId ?? (normalizedTargetType === 'team' ? teamId : null)
  );
  const normalizedTargetUserId = normalizePositiveInt(targetUserId);

  let resolvedTargetType: PaymentOrderTargetType | null = normalizedTargetType;
  let resolvedTargetTeamId: number | null = normalizedTargetTeamId;
  let resolvedTargetUserId: number | null = normalizedTargetUserId;

  if (!resolvedTargetType && normalizedTargetUserId) {
    resolvedTargetType = 'user';
  } else if (!resolvedTargetType && (normalizedTargetTeamId || normalizedTeamId)) {
    resolvedTargetType = 'team';
  }

  if (resolvedTargetType === 'team') {
    resolvedTargetTeamId = normalizedTargetTeamId ?? normalizedTeamId;
    resolvedTargetUserId = null;
  } else if (resolvedTargetType === 'user') {
    resolvedTargetTeamId = null;
    resolvedTargetUserId = normalizedTargetUserId;
  } else {
    resolvedTargetTeamId = null;
    resolvedTargetUserId = null;
  }

  if (resolvedTargetType === 'team' && !resolvedTargetTeamId) {
    resolvedTargetType = null;
  }

  if (resolvedTargetType === 'user' && !resolvedTargetUserId) {
    resolvedTargetType = null;
  }

  if (!resolvedTargetType) {
    resolvedTargetTeamId = null;
    resolvedTargetUserId = null;
  }

  const safeValues = {
    provider: safeProvider,
    orderType: normalizedOrderType,
    status: normalizeStatus(status),
    eventType: safeEventType,
    source: normalizeSource(source),
    moduleId: normalizeText(moduleId, 120),
    teamId: normalizedTeamId,
    targetType: resolvedTargetType,
    targetTeamId: resolvedTargetTeamId,
    targetUserId: resolvedTargetUserId,
    subscriptionTemplateId: normalizePositiveInt(subscriptionTemplateId),
    paymentMethod: normalizeText(paymentMethod, 60),
    planName: normalizeText(planName, 100),
    providerPlanId: normalizeText(providerPlanId, 255),
    externalOrderId: safeExternalOrderId,
    externalPaymentId: safeExternalPaymentId,
    amount: normalizeAmount(amount),
    currency: normalizeText(currency, 10)?.toUpperCase() || null,
    message: normalizeText(message, 1000),
    metadata: normalizeMetadata(metadata),
    updatedAt: new Date()
  };

  try {
    if (safeExternalPaymentId) {
      const [persistedOrder] = await db
        .insert(paymentOrders)
        .values(safeValues)
        .onConflictDoUpdate({
          target: [paymentOrders.provider, paymentOrders.externalPaymentId],
          set: {
            status: safeValues.status,
            eventType: safeValues.eventType,
            source: safeValues.source,
            orderType: safeValues.orderType,
            moduleId: sql`coalesce(excluded.module_id, ${paymentOrders.moduleId})`,
            teamId: sql`coalesce(excluded.team_id, ${paymentOrders.teamId})`,
            targetType: sql`coalesce(excluded.target_type, ${paymentOrders.targetType})`,
            targetTeamId: sql`coalesce(excluded.target_team_id, ${paymentOrders.targetTeamId})`,
            targetUserId: sql`coalesce(excluded.target_user_id, ${paymentOrders.targetUserId})`,
            subscriptionTemplateId: sql`coalesce(excluded.subscription_template_id, ${paymentOrders.subscriptionTemplateId})`,
            paymentMethod: sql`coalesce(excluded.payment_method, ${paymentOrders.paymentMethod})`,
            planName: sql`coalesce(excluded.plan_name, ${paymentOrders.planName})`,
            providerPlanId: sql`coalesce(excluded.provider_plan_id, ${paymentOrders.providerPlanId})`,
            externalOrderId: sql`coalesce(excluded.external_order_id, ${paymentOrders.externalOrderId})`,
            amount: sql`coalesce(excluded.amount, ${paymentOrders.amount})`,
            currency: sql`coalesce(excluded.currency, ${paymentOrders.currency})`,
            message: sql`coalesce(excluded.message, ${paymentOrders.message})`,
            metadata: sql`coalesce(excluded.metadata, ${paymentOrders.metadata})`,
            updatedAt: safeValues.updatedAt
          }
        })
        .returning({
          id: paymentOrders.id,
          provider: paymentOrders.provider,
          orderType: paymentOrders.orderType,
          moduleId: paymentOrders.moduleId,
          status: paymentOrders.status,
          eventType: paymentOrders.eventType,
          source: paymentOrders.source,
          teamId: paymentOrders.teamId,
          targetType: paymentOrders.targetType,
          targetTeamId: paymentOrders.targetTeamId,
          targetUserId: paymentOrders.targetUserId,
          subscriptionTemplateId: paymentOrders.subscriptionTemplateId,
          paymentMethod: paymentOrders.paymentMethod,
          planName: paymentOrders.planName,
          providerPlanId: paymentOrders.providerPlanId,
          externalOrderId: paymentOrders.externalOrderId,
          externalPaymentId: paymentOrders.externalPaymentId,
          amount: paymentOrders.amount,
          currency: paymentOrders.currency,
          message: paymentOrders.message,
          metadata: paymentOrders.metadata,
          createdAt: paymentOrders.createdAt,
          updatedAt: paymentOrders.updatedAt
        });

      return (persistedOrder as UpsertPaymentOrderResult | undefined) ?? null;
    }

    const [persistedOrder] = await db
      .insert(paymentOrders)
      .values(safeValues)
      .returning({
        id: paymentOrders.id,
        provider: paymentOrders.provider,
        orderType: paymentOrders.orderType,
        moduleId: paymentOrders.moduleId,
        status: paymentOrders.status,
        eventType: paymentOrders.eventType,
        source: paymentOrders.source,
        teamId: paymentOrders.teamId,
        targetType: paymentOrders.targetType,
        targetTeamId: paymentOrders.targetTeamId,
        targetUserId: paymentOrders.targetUserId,
        subscriptionTemplateId: paymentOrders.subscriptionTemplateId,
        paymentMethod: paymentOrders.paymentMethod,
        planName: paymentOrders.planName,
        providerPlanId: paymentOrders.providerPlanId,
        externalOrderId: paymentOrders.externalOrderId,
        externalPaymentId: paymentOrders.externalPaymentId,
        amount: paymentOrders.amount,
        currency: paymentOrders.currency,
        message: paymentOrders.message,
        metadata: paymentOrders.metadata,
        createdAt: paymentOrders.createdAt,
        updatedAt: paymentOrders.updatedAt
      });

    return (persistedOrder as UpsertPaymentOrderResult | undefined) ?? null;
  } catch (error) {
    console.error('Unable to persist payment order:', error);
    return null;
  }
}
