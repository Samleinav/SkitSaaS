import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { subscriptionAssignments } from '@/lib/db/schema';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';

export type SubscriptionAssignmentTarget = {
  targetType: 'team' | 'user';
  targetId: number;
};

export type ActivateSubscriptionAssignmentInput = SubscriptionAssignmentTarget & {
  subscriptionTemplateId: number;
  paymentProvider?: string | null;
  providerReferenceId?: string | null;
  providerPlanId?: string | null;
  status: 'free' | 'trialing' | 'active' | 'unpaid' | 'canceled';
  planName?: string | null;
  sourceOrderId?: number | null;
  effectiveFrom?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: Date | null;
};

export type SuspendSubscriptionAssignmentInput = SubscriptionAssignmentTarget & {
  status: 'unpaid' | 'canceled';
  sourceOrderId?: number | null;
  effectiveTo?: Date | null;
};

export type SubscriptionAssignmentWriteResult =
  | 'inserted'
  | 'updated'
  | 'closed'
  | 'skipped'
  | 'not_found';

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

function normalizeStatus(
  status: string | null | undefined
): 'free' | 'trialing' | 'active' | 'unpaid' | 'canceled' {
  if (
    status === 'free' ||
    status === 'trialing' ||
    status === 'active' ||
    status === 'unpaid' ||
    status === 'canceled'
  ) {
    return status;
  }

  return 'active';
}

function normalizeOptionalDate(value: Date | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) {
    return undefined;
  }

  return value;
}

function normalizeOptionalBoolean(value: boolean | null | undefined) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return Boolean(value);
}

function isSameDate(
  left: Date | null | undefined,
  right: Date | null | undefined
) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.getTime() === right.getTime();
}

async function getActiveSubscriptionAssignment(target: SubscriptionAssignmentTarget) {
  const [active] = await db
    .select({
      id: subscriptionAssignments.id,
      targetType: subscriptionAssignments.targetType,
      targetTeamId: subscriptionAssignments.targetTeamId,
      targetUserId: subscriptionAssignments.targetUserId,
      subscriptionTemplateId: subscriptionAssignments.subscriptionTemplateId,
      paymentProvider: subscriptionAssignments.paymentProvider,
      providerReferenceId: subscriptionAssignments.providerReferenceId,
      providerPlanId: subscriptionAssignments.providerPlanId,
      status: subscriptionAssignments.status,
      planName: subscriptionAssignments.planName,
      currentPeriodStart: subscriptionAssignments.currentPeriodStart,
      currentPeriodEnd: subscriptionAssignments.currentPeriodEnd,
      trialEndsAt: subscriptionAssignments.trialEndsAt,
      cancelAtPeriodEnd: subscriptionAssignments.cancelAtPeriodEnd,
      canceledAt: subscriptionAssignments.canceledAt,
      effectiveFrom: subscriptionAssignments.effectiveFrom,
      effectiveTo: subscriptionAssignments.effectiveTo,
      sourceOrderId: subscriptionAssignments.sourceOrderId,
      updatedAt: subscriptionAssignments.updatedAt,
    })
    .from(subscriptionAssignments)
    .where(
      and(
        eq(subscriptionAssignments.targetType, target.targetType),
        target.targetType === 'team'
          ? eq(subscriptionAssignments.targetTeamId, target.targetId)
          : eq(subscriptionAssignments.targetUserId, target.targetId),
        isNull(subscriptionAssignments.effectiveTo)
      )
    )
    .limit(1);

  return active ?? null;
}

export async function activateSubscriptionAssignment(
  input: ActivateSubscriptionAssignmentInput
): Promise<SubscriptionAssignmentWriteResult> {
  const targetId = normalizePositiveInt(input.targetId);
  const templateId = normalizePositiveInt(input.subscriptionTemplateId);

  if (!targetId || !templateId) {
    return 'skipped';
  }

  const now = new Date();
  const currentPeriodStart = normalizeOptionalDate(input.currentPeriodStart);
  const currentPeriodEnd = normalizeOptionalDate(input.currentPeriodEnd);
  const trialEndsAt = normalizeOptionalDate(input.trialEndsAt);
  const cancelAtPeriodEnd = normalizeOptionalBoolean(input.cancelAtPeriodEnd);
  const canceledAt = normalizeOptionalDate(input.canceledAt);
  const values = {
    targetType: input.targetType,
    targetTeamId: input.targetType === 'team' ? targetId : null,
    targetUserId: input.targetType === 'user' ? targetId : null,
    subscriptionTemplateId: templateId,
    paymentProvider: normalizeText(input.paymentProvider, 20),
    providerReferenceId: normalizeText(input.providerReferenceId, 255),
    providerPlanId: normalizeText(input.providerPlanId, 255),
    status: normalizeStatus(input.status),
    planName: normalizeText(input.planName, 100),
    sourceOrderId: normalizePositiveInt(input.sourceOrderId),
    effectiveFrom: input.effectiveFrom ?? now,
    updatedAt: now,
    ...(currentPeriodStart !== undefined
      ? { currentPeriodStart }
      : {}),
    ...(currentPeriodEnd !== undefined
      ? { currentPeriodEnd }
      : {}),
    ...(trialEndsAt !== undefined ? { trialEndsAt } : {}),
    ...(cancelAtPeriodEnd !== undefined
      ? { cancelAtPeriodEnd }
      : {}),
    ...(canceledAt !== undefined ? { canceledAt } : {}),
  } satisfies Partial<typeof subscriptionAssignments.$inferInsert> & {
    targetType: string;
    targetTeamId: number | null;
    targetUserId: number | null;
    subscriptionTemplateId: number;
    status: string;
    effectiveFrom: Date;
    updatedAt: Date;
  };

  const active = await getActiveSubscriptionAssignment({
    targetType: input.targetType,
    targetId,
  });

  if (!active) {
    await db.insert(subscriptionAssignments).values(values);
    await emitEventAsync(
      EVENT_HOOKS.subscriptionAssignmentActivated,
      {
        targetType: input.targetType,
        targetId,
        subscriptionTemplateId: templateId,
        status: values.status
      },
      { source: '/lib/payments/subscription-assignments' }
    );
    return 'inserted';
  }

  const hasPeriodChanges =
    (currentPeriodStart !== undefined &&
      !isSameDate(active.currentPeriodStart, currentPeriodStart)) ||
    (currentPeriodEnd !== undefined &&
      !isSameDate(active.currentPeriodEnd, currentPeriodEnd)) ||
    (trialEndsAt !== undefined &&
      !isSameDate(active.trialEndsAt, trialEndsAt)) ||
    (cancelAtPeriodEnd !== undefined &&
      (active.cancelAtPeriodEnd ?? false) !== cancelAtPeriodEnd) ||
    (canceledAt !== undefined &&
      !isSameDate(active.canceledAt, canceledAt));

  const hasChanges =
    active.subscriptionTemplateId !== values.subscriptionTemplateId ||
    (active.paymentProvider ?? null) !== values.paymentProvider ||
    (active.providerReferenceId ?? null) !== values.providerReferenceId ||
    (active.providerPlanId ?? null) !== values.providerPlanId ||
    active.status !== values.status ||
    (active.planName ?? null) !== values.planName ||
    (active.sourceOrderId ?? null) !== values.sourceOrderId ||
    hasPeriodChanges;

  if (!hasChanges) {
    return 'skipped';
  }

  const updateValues: Partial<typeof subscriptionAssignments.$inferInsert> = {
    subscriptionTemplateId: values.subscriptionTemplateId,
    paymentProvider: values.paymentProvider,
    providerReferenceId: values.providerReferenceId,
    providerPlanId: values.providerPlanId,
    status: values.status,
    planName: values.planName,
    sourceOrderId: values.sourceOrderId,
    updatedAt: now,
  };

  if (currentPeriodStart !== undefined) {
    updateValues.currentPeriodStart = currentPeriodStart;
  }
  if (currentPeriodEnd !== undefined) {
    updateValues.currentPeriodEnd = currentPeriodEnd;
  }
  if (trialEndsAt !== undefined) {
    updateValues.trialEndsAt = trialEndsAt;
  }
  if (cancelAtPeriodEnd !== undefined) {
    updateValues.cancelAtPeriodEnd = cancelAtPeriodEnd;
  }
  if (canceledAt !== undefined) {
    updateValues.canceledAt = canceledAt;
  }

  await db
    .update(subscriptionAssignments)
    .set(updateValues)
    .where(eq(subscriptionAssignments.id, active.id));

  await emitEventAsync(
    EVENT_HOOKS.subscriptionAssignmentActivated,
    {
      targetType: input.targetType,
      targetId,
      subscriptionTemplateId: templateId,
      status: values.status
    },
    { source: '/lib/payments/subscription-assignments' }
  );

  return 'updated';
}

export async function suspendSubscriptionAssignment(
  input: SuspendSubscriptionAssignmentInput
): Promise<SubscriptionAssignmentWriteResult> {
  const targetId = normalizePositiveInt(input.targetId);
  if (!targetId) {
    return 'skipped';
  }

  const status = normalizeStatus(input.status);
  const sourceOrderId = normalizePositiveInt(input.sourceOrderId);
  const now = new Date();
  const effectiveTo = input.effectiveTo ?? now;
  const active = await getActiveSubscriptionAssignment({
    targetType: input.targetType,
    targetId,
  });

  if (!active) {
    return 'not_found';
  }

  const hasChanges =
    active.status !== status ||
    (active.sourceOrderId ?? null) !== sourceOrderId ||
    active.effectiveTo === null;

  if (!hasChanges) {
    return 'skipped';
  }

  await db
    .update(subscriptionAssignments)
    .set({
      status,
      sourceOrderId,
      effectiveTo,
      updatedAt: now,
    })
    .where(eq(subscriptionAssignments.id, active.id));

  await emitEventAsync(
    status === 'canceled'
      ? EVENT_HOOKS.subscriptionAssignmentCanceled
      : EVENT_HOOKS.subscriptionAssignmentSuspended,
    {
      targetType: input.targetType,
      targetId,
      status
    },
    { source: '/lib/payments/subscription-assignments' }
  );

  return 'closed';
}
