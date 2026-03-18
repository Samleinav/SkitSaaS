import 'server-only';

import { and, eq, isNull, sql } from 'drizzle-orm';
import type {
  QuotaContext,
  SubscriptionFeatureValueType,
  SubscriptionFeaturesAdapter
} from '@skitsaas/sdk/server';
import { adminDb } from '@/lib/db/drizzle';
import {
  subscriptionAssignments,
  subscriptionTemplateFeatures,
  quotaUsage,
} from '@/lib/db/schema';

const TRUE_VALUES = new Set([
  '1',
  'true',
  'yes',
  'y',
  'on',
  'enabled',
  'allow',
  'allowed'
]);

const FALSE_VALUES = new Set([
  '0',
  'false',
  'no',
  'n',
  'off',
  'disabled',
  'deny',
  'denied'
]);

function parseBooleanFeatureValue(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the active subscription template ID for a given QuotaContext.
 * Returns null when no active assignment exists (free / unauthenticated).
 */
async function resolveTemplateId(ctx: QuotaContext): Promise<number | null> {
  if (ctx.teamId !== null) {
    const rows = await adminDb
      .select({ templateId: subscriptionAssignments.subscriptionTemplateId })
      .from(subscriptionAssignments)
      .where(
        and(
          eq(subscriptionAssignments.targetType, 'team'),
          eq(subscriptionAssignments.targetTeamId, ctx.teamId),
          isNull(subscriptionAssignments.effectiveTo)
        )
      )
      .limit(1);
    return rows[0]?.templateId ?? null;
  }

  if (ctx.userId !== null) {
    const rows = await adminDb
      .select({ templateId: subscriptionAssignments.subscriptionTemplateId })
      .from(subscriptionAssignments)
      .where(
        and(
          eq(subscriptionAssignments.targetType, 'user'),
          eq(subscriptionAssignments.targetUserId, ctx.userId),
          isNull(subscriptionAssignments.effectiveTo)
        )
      )
      .limit(1);
    return rows[0]?.templateId ?? null;
  }

  return null;
}

async function resolveTemplateFeature(
  featureKey: string,
  ctx: QuotaContext
): Promise<{
  found: boolean;
  valueType: SubscriptionFeatureValueType | null;
  rawValue: string | null;
}> {
  const templateId = await resolveTemplateId(ctx);
  if (!templateId) {
    return {
      found: false,
      valueType: null,
      rawValue: null
    };
  }

  const rows = await adminDb
    .select({
      featureValue: subscriptionTemplateFeatures.featureValue,
      valueType: subscriptionTemplateFeatures.valueType
    })
    .from(subscriptionTemplateFeatures)
    .where(
      and(
        eq(subscriptionTemplateFeatures.templateId, templateId),
        eq(subscriptionTemplateFeatures.featureKey, featureKey)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return {
      found: false,
      valueType: null,
      rawValue: null
    };
  }

  return {
    found: true,
    valueType:
      row.valueType === 'boolean' ||
      row.valueType === 'number' ||
      row.valueType === 'text' ||
      row.valueType === 'null'
        ? row.valueType
        : null,
    rawValue: row.featureValue
  };
}

/**
 * Return the current billing period start and end for a quota context.
 * Falls back to the start of the current UTC month when no active subscription exists.
 */
async function resolvePeriod(ctx: QuotaContext): Promise<{ start: Date; end: Date | null }> {
  const now = new Date();

  if (ctx.teamId !== null) {
    const rows = await adminDb
      .select({
        periodStart: subscriptionAssignments.currentPeriodStart,
        periodEnd: subscriptionAssignments.currentPeriodEnd,
      })
      .from(subscriptionAssignments)
      .where(
        and(
          eq(subscriptionAssignments.targetType, 'team'),
          eq(subscriptionAssignments.targetTeamId, ctx.teamId),
          isNull(subscriptionAssignments.effectiveTo)
        )
      )
      .limit(1);

    const assignment = rows[0];
    if (assignment?.periodStart) {
      return { start: assignment.periodStart, end: assignment.periodEnd ?? null };
    }
  }

  if (ctx.userId !== null) {
    const rows = await adminDb
      .select({
        periodStart: subscriptionAssignments.currentPeriodStart,
        periodEnd: subscriptionAssignments.currentPeriodEnd,
      })
      .from(subscriptionAssignments)
      .where(
        and(
          eq(subscriptionAssignments.targetType, 'user'),
          eq(subscriptionAssignments.targetUserId, ctx.userId),
          isNull(subscriptionAssignments.effectiveTo)
        )
      )
      .limit(1);

    const assignment = rows[0];
    if (assignment?.periodStart) {
      return { start: assignment.periodStart, end: assignment.periodEnd ?? null };
    }
  }

  // No active subscription — use calendar month
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: monthStart, end: monthEnd };
}

// ─── Adapter implementation ───────────────────────────────────────────────────

export const quotaAdapter: SubscriptionFeaturesAdapter = {
  async getPlanFeatureValue(featureKey, ctx) {
    return resolveTemplateFeature(featureKey, ctx);
  },

  async getFeatureLimit(featureKey, ctx) {
    const feature = await resolveTemplateFeature(featureKey, ctx);

    if (!feature.found) {
      // No subscription → treat as no access (feature not available)
      return { enabled: false, limit: null };
    }

    // valueType 'boolean' / 'null' → feature flag with no numeric limit
    if (feature.valueType === 'null') {
      return { enabled: true, limit: null };
    }

    if (feature.valueType === 'boolean') {
      return {
        enabled: parseBooleanFeatureValue(feature.rawValue) ?? false,
        limit: null
      };
    }

    if (feature.valueType === 'text') {
      return { enabled: feature.rawValue !== null, limit: null };
    }

    // valueType 'number' → numeric limit
    if (feature.valueType === 'number') {
      const limit = feature.rawValue !== null ? parseInt(feature.rawValue, 10) : null;
      if (limit === null || isNaN(limit)) {
        return { enabled: true, limit: null };
      }
      // 0 or negative limit means disabled
      if (limit <= 0) {
        return { enabled: false, limit };
      }
      return { enabled: true, limit };
    }

    // Unknown valueType — treat as enabled with no numeric limit
    return { enabled: true, limit: null };
  },

  async getUsage(featureKey, ctx) {
    const { start } = await resolvePeriod(ctx);

    const scopeCondition =
      ctx.teamId !== null
        ? and(
            eq(quotaUsage.scopeType, 'team'),
            eq(quotaUsage.scopeTeamId, ctx.teamId),
            eq(quotaUsage.featureKey, featureKey),
            eq(quotaUsage.periodStart, start)
          )
        : and(
            eq(quotaUsage.scopeType, 'user'),
            eq(quotaUsage.scopeUserId, ctx.userId!),
            eq(quotaUsage.featureKey, featureKey),
            eq(quotaUsage.periodStart, start)
          );

    const rows = await adminDb
      .select({ used: quotaUsage.used, periodEnd: quotaUsage.periodEnd })
      .from(quotaUsage)
      .where(scopeCondition)
      .limit(1);

    const row = rows[0];
    return {
      used: row?.used ?? 0,
      resetAt: row?.periodEnd ?? undefined,
    };
  },

  async incrementUsage(featureKey, ctx, amount) {
    const { start, end } = await resolvePeriod(ctx);

    const scopeType = ctx.teamId !== null ? 'team' : 'user';
    const scopeCondition =
      ctx.teamId !== null
        ? and(
            eq(quotaUsage.scopeType, 'team'),
            eq(quotaUsage.scopeTeamId, ctx.teamId),
            eq(quotaUsage.featureKey, featureKey),
            eq(quotaUsage.periodStart, start)
          )
        : and(
            eq(quotaUsage.scopeType, 'user'),
            eq(quotaUsage.scopeUserId, ctx.userId!),
            eq(quotaUsage.featureKey, featureKey),
            eq(quotaUsage.periodStart, start)
          );

    // Atomic increment via UPDATE ... RETURNING; INSERT if row does not exist yet.
    const updated = await adminDb
      .update(quotaUsage)
      .set({ used: sql`${quotaUsage.used} + ${amount}`, updatedAt: sql`now()` })
      .where(scopeCondition)
      .returning({ used: quotaUsage.used });

    if (updated.length > 0) {
      return { used: updated[0].used };
    }

    // Row did not exist — insert it (race condition safe: unique index prevents duplicates)
    try {
      const inserted = await adminDb
        .insert(quotaUsage)
        .values({
          scopeType,
          scopeTeamId: ctx.teamId,
          scopeUserId: ctx.userId,
          featureKey,
          used: amount,
          periodStart: start,
          periodEnd: end,
        })
        .returning({ used: quotaUsage.used });
      return { used: inserted[0]?.used ?? amount };
    } catch {
      // Another request inserted concurrently — retry the update
      const retried = await adminDb
        .update(quotaUsage)
        .set({ used: sql`${quotaUsage.used} + ${amount}`, updatedAt: sql`now()` })
        .where(scopeCondition)
        .returning({ used: quotaUsage.used });
      return { used: retried[0]?.used ?? amount };
    }
  },
};
