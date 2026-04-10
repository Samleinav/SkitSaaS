import { and, eq, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { client, db } from '@/lib/db/drizzle';
import {
  subscriptionChangeRequests,
  subscriptionTemplates
} from '@/lib/db/schema';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import {
  activateSubscriptionAssignment,
  suspendSubscriptionAssignment
} from '@/lib/payments/subscription-assignments';
import { resolveDefaultTierFallbackAssignmentStatus } from '@/lib/payments/subscription-default-templates';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';

const DEFAULT_LIMIT = 50;
const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off']);

type ChangeRequestStatus =
  | 'pending'
  | 'scheduled'
  | 'processing'
  | 'applied'
  | 'canceled'
  | 'failed';

function readBoolean(value: string | undefined, defaultValue: boolean) {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }
  if (FALSY_VALUES.has(normalized)) {
    return false;
  }

  return defaultValue;
}

function readLimit() {
  const raw = process.env.CHANGE_REQUEST_LIMIT;
  if (!raw) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, 500);
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

function parseMetadata(input: string | null) {
  if (!input) {
    return null;
  }

  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function updateRequestStatus(
  requestId: number,
  status: ChangeRequestStatus,
  effectiveAt?: Date | null
) {
  await db
    .update(subscriptionChangeRequests)
    .set({
      status,
      ...(effectiveAt ? { effectiveAt } : {}),
      updatedAt: new Date()
    })
    .where(eq(subscriptionChangeRequests.id, requestId));
}

async function run() {
  const dryRun = readBoolean(process.env.CHANGE_REQUEST_DRY_RUN, false);
  const limit = readLimit();
  const now = new Date();

  const requests = await db
    .select({
      id: subscriptionChangeRequests.id,
      targetType: subscriptionChangeRequests.targetType,
      targetTeamId: subscriptionChangeRequests.targetTeamId,
      targetUserId: subscriptionChangeRequests.targetUserId,
      currentAssignmentId: subscriptionChangeRequests.currentAssignmentId,
      currentTemplateId: subscriptionChangeRequests.currentTemplateId,
      requestedTemplateId: subscriptionChangeRequests.requestedTemplateId,
      requestedProvider: subscriptionChangeRequests.requestedProvider,
      requestedPaymentMethod: subscriptionChangeRequests.requestedPaymentMethod,
      requestedProviderPlanId: subscriptionChangeRequests.requestedProviderPlanId,
      requestedPlanName: subscriptionChangeRequests.requestedPlanName,
      changeReason: subscriptionChangeRequests.changeReason,
      changeMode: subscriptionChangeRequests.changeMode,
      status: subscriptionChangeRequests.status,
      effectiveAt: subscriptionChangeRequests.effectiveAt,
      sourceOrderId: subscriptionChangeRequests.sourceOrderId,
      metadata: subscriptionChangeRequests.metadata
    })
    .from(subscriptionChangeRequests)
    .where(
      and(
        inArray(subscriptionChangeRequests.status, ['pending', 'scheduled']),
        or(
          and(
            isNotNull(subscriptionChangeRequests.effectiveAt),
            lte(subscriptionChangeRequests.effectiveAt, now)
          ),
          and(
            isNull(subscriptionChangeRequests.effectiveAt),
            eq(subscriptionChangeRequests.changeMode, 'immediate')
          )
        )
      )
    )
    .orderBy(subscriptionChangeRequests.effectiveAt)
    .limit(limit);

  const results: Array<Record<string, unknown>> = [];

  for (const request of requests) {
    try {
      const targetId =
        request.targetType === 'team'
          ? request.targetTeamId
          : request.targetUserId;

      if (!targetId) {
        results.push({
          id: request.id,
          status: 'failed',
          reason: 'target_not_resolved'
        });

        if (!dryRun) {
          await updateRequestStatus(request.id, 'failed');
        }
        continue;
      }

      const metadata = parseMetadata(request.metadata);
      const providerReferenceId = normalizeText(
        (metadata as Record<string, unknown> | null)?.providerReferenceId as
          | string
          | null
          | undefined,
        255
      );

      const effectiveAt = request.effectiveAt ?? now;

      if (!dryRun) {
        await updateRequestStatus(request.id, 'processing', effectiveAt);
      }

      const template = await db
        .select({
          id: subscriptionTemplates.id,
          name: subscriptionTemplates.name,
          priceCents: subscriptionTemplates.priceCents
        })
        .from(subscriptionTemplates)
        .where(eq(subscriptionTemplates.id, request.requestedTemplateId))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!dryRun) {
        await suspendSubscriptionAssignment({
          targetType: request.targetType as 'team' | 'user',
          targetId,
          status: 'canceled',
          sourceOrderId: request.sourceOrderId ?? null,
          effectiveTo: effectiveAt ?? undefined
        });

        await activateSubscriptionAssignment({
          targetType: request.targetType as 'team' | 'user',
          targetId,
          subscriptionTemplateId: request.requestedTemplateId,
          paymentProvider: request.requestedProvider ?? null,
          providerReferenceId: providerReferenceId,
          providerPlanId: request.requestedProviderPlanId ?? null,
          status:
            request.requestedProvider || request.requestedProviderPlanId
              ? 'active'
              : resolveDefaultTierFallbackAssignmentStatus(template),
          planName:
            request.requestedPlanName ??
            template?.name ??
            'Subscription',
          sourceOrderId: request.sourceOrderId ?? null,
          effectiveFrom: effectiveAt ?? undefined,
          currentPeriodStart: effectiveAt ?? undefined
        });

        await updateRequestStatus(request.id, 'applied');
      }

      await createSysActivityLog({
        eventType: 'payments.subscription.change_request.applied',
        eventCategory: 'payments',
        action: 'update',
        status: dryRun ? 'warning' : 'success',
        targetUserId: request.targetType === 'user' ? targetId : null,
        teamId: request.targetType === 'team' ? targetId : null,
        entityType: 'subscription_change_request',
        entityId: request.id,
        source: '/scripts/subscription-change-worker',
        message: dryRun
          ? 'Change request is due (dry-run).'
          : 'Subscription change request applied.',
        metadata: {
          changeMode: request.changeMode,
          changeReason: request.changeReason,
          currentAssignmentId: request.currentAssignmentId,
          currentTemplateId: request.currentTemplateId,
          requestedTemplateId: request.requestedTemplateId,
          requestedProvider: request.requestedProvider,
          requestedProviderPlanId: request.requestedProviderPlanId,
          requestedPlanName: request.requestedPlanName,
          effectiveAt: effectiveAt?.toISOString() ?? null,
          providerReferenceId,
          dryRun
        }
      });

      await emitEventAsync(
        EVENT_HOOKS.subscriptionChangeRequestApplied,
        {
          changeRequestId: request.id,
          targetType: request.targetType,
          targetId,
          requestedTemplateId: request.requestedTemplateId,
          requestedProvider: request.requestedProvider,
          effectiveAt: effectiveAt?.toISOString() ?? null,
          dryRun
        },
        { source: '/scripts/subscription-change-worker' }
      );

      results.push({
        id: request.id,
        status: dryRun ? 'dry_run' : 'applied',
        targetType: request.targetType,
        targetId,
        requestedTemplateId: request.requestedTemplateId,
        requestedProvider: request.requestedProvider,
        effectiveAt: effectiveAt?.toISOString() ?? null
      });
    } catch (error) {
      results.push({
        id: request.id,
        status: 'failed',
        error: (error as Error).message
      });

      if (!dryRun) {
        await updateRequestStatus(request.id, 'failed');
      }

      await createSysActivityLog({
        eventType: 'payments.subscription.change_request.failed',
        eventCategory: 'payments',
        action: 'update',
        status: 'failed',
        targetUserId:
          request.targetType === 'user' ? request.targetUserId ?? null : null,
        teamId:
          request.targetType === 'team' ? request.targetTeamId ?? null : null,
        entityType: 'subscription_change_request',
        entityId: request.id,
        source: '/scripts/subscription-change-worker',
        message: 'Subscription change request failed to apply.',
        metadata: {
          changeMode: request.changeMode,
          changeReason: request.changeReason,
          requestedTemplateId: request.requestedTemplateId,
          requestedProvider: request.requestedProvider,
          effectiveAt: request.effectiveAt?.toISOString() ?? null,
          error: (error as Error).message,
          dryRun
        }
      });

      await emitEventAsync(
        EVENT_HOOKS.subscriptionChangeRequestFailed,
        {
          changeRequestId: request.id,
          targetType: request.targetType,
          targetId:
            request.targetType === 'team'
              ? request.targetTeamId
              : request.targetUserId,
          requestedTemplateId: request.requestedTemplateId,
          requestedProvider: request.requestedProvider,
          effectiveAt: request.effectiveAt?.toISOString() ?? null,
          error: (error as Error).message,
          dryRun
        },
        { source: '/scripts/subscription-change-worker' }
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    limit,
    processed: results.length,
    results
  };

  console.log(JSON.stringify(report, null, 2));
}

run()
  .catch((error) => {
    console.error('Subscription change worker failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
