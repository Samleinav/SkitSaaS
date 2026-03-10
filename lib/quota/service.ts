import 'server-only';

import { and, eq, isNull, sql } from 'drizzle-orm';
import type { QuotaContext, SubscriptionFeaturesAdapter } from '@skitsaas/sdk/server';
import { adminDb } from '@/lib/db/drizzle';
import {
  subscriptionAssignments,
  subscriptionTemplateFeatures,
  quotaUsage,
} from '@/lib/db/schema';

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
  async getFeatureLimit(featureKey, ctx) {
    const templateId = await resolveTemplateId(ctx);

    if (!templateId) {
      // No subscription → treat as no access (feature not available)
      return { enabled: false, limit: null };
    }

    const rows = await adminDb
      .select({
        featureValue: subscriptionTemplateFeatures.featureValue,
        valueType: subscriptionTemplateFeatures.valueType,
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
      return { enabled: false, limit: null };
    }

    // valueType 'boolean' / 'null' → feature flag with no numeric limit
    if (row.valueType === 'boolean' || row.valueType === 'null' || row.valueType === 'text') {
      const enabled =
        row.featureValue === 'true' || row.featureValue === '1' || row.featureValue === 'yes';
      return { enabled, limit: null };
    }

    // valueType 'number' → numeric limit
    if (row.valueType === 'number') {
      const limit = row.featureValue !== null ? parseInt(row.featureValue, 10) : null;
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
