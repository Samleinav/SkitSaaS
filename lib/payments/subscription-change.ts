import { db } from '@/lib/db/drizzle';
import { subscriptionChangeRequests } from '@/lib/db/schema';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type SubscriptionChangeMode = 'period_end' | 'immediate';

export type SubscriptionChangeReason =
  | 'upgrade'
  | 'downgrade'
  | 'plan_change'
  | 'payment_method_change'
  | 'provider_switch'
  | 'manual_admin'
  | 'system';

export type CarryoverPlan = {
  effectiveAt: Date;
  basis: 'current_period_end' | 'trial_end' | 'now';
  carryoverDays: number;
};

export function buildCarryoverPlan({
  now = new Date(),
  currentPeriodEnd,
  trialEndsAt,
}: {
  now?: Date;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
}): CarryoverPlan {
  const normalizedNow =
    now instanceof Date && !Number.isNaN(now.valueOf()) ? now : new Date();

  const candidates = [
    currentPeriodEnd instanceof Date && !Number.isNaN(currentPeriodEnd.valueOf())
      ? currentPeriodEnd
      : null,
    trialEndsAt instanceof Date && !Number.isNaN(trialEndsAt.valueOf())
      ? trialEndsAt
      : null,
    normalizedNow,
  ].filter(Boolean) as Date[];

  const effectiveAt = new Date(
    Math.max(...candidates.map((value) => value.getTime()))
  );

  const basis =
    currentPeriodEnd &&
    currentPeriodEnd instanceof Date &&
    !Number.isNaN(currentPeriodEnd.valueOf()) &&
    currentPeriodEnd.getTime() === effectiveAt.getTime()
      ? 'current_period_end'
      : trialEndsAt &&
          trialEndsAt instanceof Date &&
          !Number.isNaN(trialEndsAt.valueOf()) &&
          trialEndsAt.getTime() === effectiveAt.getTime()
        ? 'trial_end'
        : 'now';

  const carryoverDays = Math.max(
    0,
    Math.ceil((effectiveAt.getTime() - normalizedNow.getTime()) / MS_PER_DAY)
  );

  return {
    effectiveAt,
    basis,
    carryoverDays,
  };
}

export type CreateSubscriptionChangeRequestInput = {
  targetType: 'team' | 'user';
  targetId: number;
  requestedTemplateId: number;
  currentAssignmentId?: number | null;
  currentTemplateId?: number | null;
  requestedProvider?: string | null;
  requestedPaymentMethod?: string | null;
  requestedProviderPlanId?: string | null;
  requestedPlanName?: string | null;
  changeReason?: SubscriptionChangeReason | null;
  changeMode?: SubscriptionChangeMode;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
  effectiveAt?: Date | null;
  sourceOrderId?: number | null;
  metadata?: unknown;
};

type CreateSubscriptionChangeRequestResult = {
  id: number;
  status: string;
  effectiveAt: Date | null;
  createdAt: Date;
};

function normalizePositiveInt(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

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

export async function createSubscriptionChangeRequest(
  input: CreateSubscriptionChangeRequestInput
): Promise<CreateSubscriptionChangeRequestResult | null> {
  const targetId = normalizePositiveInt(input.targetId);
  const requestedTemplateId = normalizePositiveInt(input.requestedTemplateId);

  if (!targetId || !requestedTemplateId) {
    return null;
  }

  const changeMode = input.changeMode ?? 'period_end';
  const effectiveAt =
    input.effectiveAt ??
    (changeMode === 'immediate'
      ? new Date()
      : buildCarryoverPlan({
          currentPeriodEnd: input.currentPeriodEnd,
          trialEndsAt: input.trialEndsAt,
        }).effectiveAt);

  const values = {
    targetType: input.targetType,
    targetTeamId: input.targetType === 'team' ? targetId : null,
    targetUserId: input.targetType === 'user' ? targetId : null,
    currentAssignmentId: normalizePositiveInt(input.currentAssignmentId),
    currentTemplateId: normalizePositiveInt(input.currentTemplateId),
    requestedTemplateId,
    requestedProvider: normalizeText(input.requestedProvider, 20),
    requestedPaymentMethod: normalizeText(input.requestedPaymentMethod, 60),
    requestedProviderPlanId: normalizeText(input.requestedProviderPlanId, 255),
    requestedPlanName: normalizeText(input.requestedPlanName, 100),
    changeReason: normalizeText(input.changeReason ?? null, 60),
    changeMode,
    effectiveAt: effectiveAt instanceof Date ? effectiveAt : null,
    sourceOrderId: normalizePositiveInt(input.sourceOrderId),
    metadata: normalizeMetadata(input.metadata),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(subscriptionChangeRequests)
    .values(values)
    .returning({
      id: subscriptionChangeRequests.id,
      status: subscriptionChangeRequests.status,
      effectiveAt: subscriptionChangeRequests.effectiveAt,
      createdAt: subscriptionChangeRequests.createdAt,
    });

  if (row) {
    await emitEventAsync(
      EVENT_HOOKS.subscriptionChangeRequestCreated,
      {
        changeRequestId: row.id,
        targetType: input.targetType,
        targetId,
        requestedTemplateId,
        changeMode,
        effectiveAt: row.effectiveAt?.toISOString() ?? null
      },
      { source: '/lib/payments/subscription-change' }
    );
  }

  return row ?? null;
}
