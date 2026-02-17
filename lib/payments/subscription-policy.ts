import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  subscriptionTrialUsage,
  type SubscriptionTemplate
} from '@/lib/db/schema';
import type { SubscriptionChangeReason } from './subscription-change';

const CATEGORY_KEY_MAX_LENGTH = 120;

export type SubscriptionPlanRelation =
  | 'same_template'
  | 'upgrade'
  | 'downgrade'
  | 'lateral_change'
  | 'new_purchase';

export type SubscriptionPlanTemplateLike = Pick<
  SubscriptionTemplate,
  'id' | 'targetScope' | 'categoryKey' | 'hierarchyRank' | 'trialPeriodDays'
>;

export type SubscriptionTrialTemplateLike = Pick<
  SubscriptionTemplate,
  'id' | 'categoryKey' | 'trialPeriodDays'
>;

export type SubscriptionTrialUsageTarget =
  | { targetType: 'team'; targetTeamId: number; targetUserId: null }
  | { targetType: 'user'; targetTeamId: null; targetUserId: number };

type SubscriptionPolicyDeps = {
  findTrialUsage: (input: {
    target: SubscriptionTrialUsageTarget;
    categoryKey: string;
  }) => Promise<{ id: number } | null>;
  insertTrialUsage: (input: {
    target: SubscriptionTrialUsageTarget;
    categoryKey: string;
    firstTemplateId: number | null;
    firstOrderId: number | null;
    consumedAt: Date;
  }) => Promise<'inserted' | 'exists'>;
};

function normalizePositiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  return null;
}

function normalizeScope(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'organization') {
    return 'team' as const;
  }

  if (normalized === 'user' || normalized === 'team') {
    return normalized;
  }

  return null;
}

function isPgUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code === '23505'
  );
}

const DEFAULT_POLICY_DEPS: SubscriptionPolicyDeps = {
  async findTrialUsage({ target, categoryKey }) {
    const [row] =
      target.targetType === 'team'
        ? await db
            .select({
              id: subscriptionTrialUsage.id
            })
            .from(subscriptionTrialUsage)
            .where(
              and(
                eq(subscriptionTrialUsage.targetType, 'team'),
                eq(subscriptionTrialUsage.targetTeamId, target.targetTeamId),
                eq(subscriptionTrialUsage.categoryKey, categoryKey)
              )
            )
            .limit(1)
        : await db
            .select({
              id: subscriptionTrialUsage.id
            })
            .from(subscriptionTrialUsage)
            .where(
              and(
                eq(subscriptionTrialUsage.targetType, 'user'),
                eq(subscriptionTrialUsage.targetUserId, target.targetUserId),
                eq(subscriptionTrialUsage.categoryKey, categoryKey)
              )
            )
            .limit(1);

    return row ?? null;
  },
  async insertTrialUsage({
    target,
    categoryKey,
    firstTemplateId,
    firstOrderId,
    consumedAt
  }) {
    try {
      await db.insert(subscriptionTrialUsage).values({
        targetType: target.targetType,
        targetTeamId: target.targetType === 'team' ? target.targetTeamId : null,
        targetUserId: target.targetType === 'user' ? target.targetUserId : null,
        categoryKey,
        firstTemplateId,
        firstOrderId,
        consumedAt,
        updatedAt: consumedAt
      });
      return 'inserted';
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        return 'exists';
      }
      throw error;
    }
  }
};

export function normalizeSubscriptionCategoryKey(
  value: unknown,
  fallbackTemplateId?: number | null
) {
  const raw =
    typeof value === 'string' ? value.trim() : '';
  const fallback =
    normalizePositiveInt(fallbackTemplateId) !== null
      ? `legacy.template.${fallbackTemplateId}`
      : '';
  const source = raw || fallback;
  if (!source) {
    return null;
  }

  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, CATEGORY_KEY_MAX_LENGTH);

  return normalized || null;
}

export function classifySubscriptionPlanRelation({
  currentTemplate,
  nextTemplate
}: {
  currentTemplate: SubscriptionPlanTemplateLike | null;
  nextTemplate: SubscriptionPlanTemplateLike;
}): SubscriptionPlanRelation {
  if (!currentTemplate) {
    return 'new_purchase';
  }

  if (currentTemplate.id === nextTemplate.id) {
    return 'same_template';
  }

  const currentScope = normalizeScope(currentTemplate.targetScope);
  const nextScope = normalizeScope(nextTemplate.targetScope);
  if (!currentScope || !nextScope || currentScope !== nextScope) {
    return 'new_purchase';
  }

  const currentCategoryKey = normalizeSubscriptionCategoryKey(
    currentTemplate.categoryKey,
    currentTemplate.id
  );
  const nextCategoryKey = normalizeSubscriptionCategoryKey(
    nextTemplate.categoryKey,
    nextTemplate.id
  );
  if (!currentCategoryKey || !nextCategoryKey || currentCategoryKey !== nextCategoryKey) {
    return 'new_purchase';
  }

  if (nextTemplate.hierarchyRank > currentTemplate.hierarchyRank) {
    return 'upgrade';
  }

  if (nextTemplate.hierarchyRank < currentTemplate.hierarchyRank) {
    return 'downgrade';
  }

  return 'lateral_change';
}

export function normalizeSubscriptionPlanRelation(
  value: unknown
): SubscriptionPlanRelation | null {
  if (
    value === 'same_template' ||
    value === 'upgrade' ||
    value === 'downgrade' ||
    value === 'lateral_change' ||
    value === 'new_purchase'
  ) {
    return value;
  }

  return null;
}

export function resolveSubscriptionChangeReasonByPlanRelation(
  relation: SubscriptionPlanRelation | null | undefined
): SubscriptionChangeReason {
  if (relation === 'upgrade') {
    return 'upgrade';
  }

  if (relation === 'downgrade') {
    return 'downgrade';
  }

  return 'plan_change';
}

export function resolveSubscriptionTrialUsageTarget({
  targetType,
  targetId = null,
  targetTeamId = null,
  targetUserId = null
}: {
  targetType: unknown;
  targetId?: number | null;
  targetTeamId?: number | null;
  targetUserId?: number | null;
}): SubscriptionTrialUsageTarget | null {
  const normalizedTargetType = normalizeScope(targetType);
  const normalizedTargetId = normalizePositiveInt(targetId);
  const normalizedTeamId = normalizePositiveInt(targetTeamId);
  const normalizedUserId = normalizePositiveInt(targetUserId);

  if (normalizedTargetType === 'team') {
    const resolvedTeamId = normalizedTeamId ?? normalizedTargetId;
    if (!resolvedTeamId) {
      return null;
    }

    return {
      targetType: 'team',
      targetTeamId: resolvedTeamId,
      targetUserId: null
    };
  }

  if (normalizedTargetType === 'user') {
    const resolvedUserId = normalizedUserId ?? normalizedTargetId;
    if (!resolvedUserId) {
      return null;
    }

    return {
      targetType: 'user',
      targetTeamId: null,
      targetUserId: resolvedUserId
    };
  }

  if (normalizedUserId) {
    return {
      targetType: 'user',
      targetTeamId: null,
      targetUserId: normalizedUserId
    };
  }

  if (normalizedTeamId) {
    return {
      targetType: 'team',
      targetTeamId: normalizedTeamId,
      targetUserId: null
    };
  }

  return null;
}

export async function isSubscriptionTemplateTrialEligible({
  template,
  target,
  categoryKeyOverride = null
}: {
  template: SubscriptionTrialTemplateLike;
  target: SubscriptionTrialUsageTarget | null;
  categoryKeyOverride?: string | null;
},
deps: SubscriptionPolicyDeps = DEFAULT_POLICY_DEPS): Promise<{
  trialEligible: boolean;
  categoryKey: string | null;
}> {
  if (template.trialPeriodDays <= 0) {
    return {
      trialEligible: false,
      categoryKey: normalizeSubscriptionCategoryKey(
        categoryKeyOverride ?? template.categoryKey,
        template.id
      )
    };
  }

  if (!target) {
    return {
      trialEligible: false,
      categoryKey: normalizeSubscriptionCategoryKey(
        categoryKeyOverride ?? template.categoryKey,
        template.id
      )
    };
  }

  const categoryKey = normalizeSubscriptionCategoryKey(
    categoryKeyOverride ?? template.categoryKey,
    template.id
  );
  if (!categoryKey) {
    return {
      trialEligible: false,
      categoryKey: null
    };
  }

  const usage = await deps.findTrialUsage({
    target,
    categoryKey
  });

  return {
    trialEligible: !usage,
    categoryKey
  };
}

export async function consumeSubscriptionTrialUsage({
  template,
  target,
  firstOrderId = null,
  consumedAt = new Date(),
  categoryKeyOverride = null
}: {
  template: SubscriptionTrialTemplateLike;
  target: SubscriptionTrialUsageTarget | null;
  firstOrderId?: number | null;
  consumedAt?: Date;
  categoryKeyOverride?: string | null;
},
deps: SubscriptionPolicyDeps = DEFAULT_POLICY_DEPS): Promise<{
  consumed: boolean;
  categoryKey: string | null;
  reason:
    | 'inserted'
    | 'already_consumed'
    | 'not_applicable'
    | 'invalid_target'
    | 'invalid_category';
}> {
  const categoryKey = normalizeSubscriptionCategoryKey(
    categoryKeyOverride ?? template.categoryKey,
    template.id
  );

  if (template.trialPeriodDays <= 0) {
    return {
      consumed: false,
      categoryKey,
      reason: 'not_applicable'
    };
  }

  if (!target) {
    return {
      consumed: false,
      categoryKey,
      reason: 'invalid_target'
    };
  }

  if (!categoryKey) {
    return {
      consumed: false,
      categoryKey: null,
      reason: 'invalid_category'
    };
  }

  const insertResult = await deps.insertTrialUsage({
    target,
    categoryKey,
    firstTemplateId: template.id,
    firstOrderId: normalizePositiveInt(firstOrderId),
    consumedAt
  });

  return insertResult === 'inserted'
    ? {
        consumed: true,
        categoryKey,
        reason: 'inserted'
      }
    : {
        consumed: false,
        categoryKey,
        reason: 'already_consumed'
      };
}
