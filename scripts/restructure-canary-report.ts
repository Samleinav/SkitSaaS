import { writeFileSync } from 'node:fs';
import {
  and,
  eq,
  gte,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { client, db } from '@/lib/db/drizzle';
import {
  paymentOrders,
  paymentTransactions,
  subscriptionAssignments,
  subscriptionTemplates,
  sysActivityLogs,
} from '@/lib/db/schema';

const DEFAULT_WINDOW_DAYS = 30;
const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off']);

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

function readWindowDays() {
  const raw = process.env.CANARY_WINDOW_DAYS;
  if (!raw) {
    return DEFAULT_WINDOW_DAYS;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_WINDOW_DAYS;
  }

  return Math.min(parsed, 365);
}

function buildSinceDate(windowDays: number) {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  return since;
}

async function countUnresolvedTargets(since: Date) {
  const [result] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(paymentOrders)
    .where(
      and(
        eq(paymentOrders.orderType, 'subscription'),
        inArray(paymentOrders.source, ['checkout', 'webhook', 'dashboard']),
        gte(paymentOrders.createdAt, since),
        isNull(paymentOrders.targetType),
        isNull(paymentOrders.targetTeamId),
        isNull(paymentOrders.targetUserId)
      )
    );

  return result?.count ?? 0;
}

async function countMissingTargetIds(since: Date) {
  const [missingTeam, missingUser] = await Promise.all([
    db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(paymentOrders)
      .where(
        and(
          eq(paymentOrders.targetType, 'team'),
          isNull(paymentOrders.targetTeamId),
          gte(paymentOrders.createdAt, since)
        )
      )
      .then((rows) => rows[0]?.count ?? 0),
    db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(paymentOrders)
      .where(
        and(
          eq(paymentOrders.targetType, 'user'),
          isNull(paymentOrders.targetUserId),
          gte(paymentOrders.createdAt, since)
        )
      )
      .then((rows) => rows[0]?.count ?? 0),
  ]);

  return {
    missingTeamTargets: missingTeam,
    missingUserTargets: missingUser,
  };
}

async function buildMissingTransactionsSummary(since: Date) {
  const [orders, transactions] = await Promise.all([
    db
      .select({
        id: paymentOrders.id,
      })
      .from(paymentOrders)
      .where(
        and(
          inArray(paymentOrders.provider, ['stripe', 'paypal']),
          inArray(paymentOrders.status, ['received', 'failed', 'canceled']),
          gte(paymentOrders.createdAt, since)
        )
      ),
    db
      .select({
        orderId: paymentTransactions.orderId,
      })
      .from(paymentTransactions)
      .where(
        and(
          inArray(paymentTransactions.provider, ['stripe', 'paypal']),
          eq(paymentTransactions.transactionType, 'sale'),
          inArray(paymentTransactions.status, [
            'succeeded',
            'failed',
            'reversed',
          ])
        )
      ),
  ]);

  const orderIdSet = new Set<number>();
  for (const row of transactions) {
    if (row.orderId) {
      orderIdSet.add(row.orderId);
    }
  }

  let missingTransactions = 0;
  const sampleOrderIds: number[] = [];
  for (const order of orders) {
    if (!orderIdSet.has(order.id)) {
      missingTransactions += 1;
      if (sampleOrderIds.length < 30) {
        sampleOrderIds.push(order.id);
      }
    }
  }

  return {
    ordersChecked: orders.length,
    missingTransactions,
    sampleOrderIds,
  };
}

async function buildAssignmentTemplateSummary() {
  const [missingTemplateRow] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(subscriptionAssignments)
    .leftJoin(
      subscriptionTemplates,
      eq(subscriptionAssignments.subscriptionTemplateId, subscriptionTemplates.id)
    )
    .where(
      and(
        isNull(subscriptionAssignments.effectiveTo),
        isNull(subscriptionTemplates.id)
      )
    );

  return missingTemplateRow?.count ?? 0;
}

async function buildDuplicateAssignmentSummary() {
  const duplicateRows = await db
    .select({
      targetType: subscriptionAssignments.targetType,
      targetTeamId: subscriptionAssignments.targetTeamId,
      targetUserId: subscriptionAssignments.targetUserId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(subscriptionAssignments)
    .where(isNull(subscriptionAssignments.effectiveTo))
    .groupBy(
      subscriptionAssignments.targetType,
      subscriptionAssignments.targetTeamId,
      subscriptionAssignments.targetUserId
    )
    .having(sql`count(*) > 1`);

  const duplicateTargets = duplicateRows.length;
  const extraAssignments = duplicateRows.reduce(
    (sum, row) => sum + Math.max(0, (row.count ?? 0) - 1),
    0
  );

  return {
    duplicateTargets,
    extraAssignments,
    sampleTargets: duplicateRows.slice(0, 10),
  };
}

async function buildLifecycleFailureSummary(since: Date) {
  const [failedRow, warningRow] = await Promise.all([
    db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(sysActivityLogs)
      .where(
        and(
          eq(sysActivityLogs.eventType, 'payments.order.subscription.lifecycle'),
          eq(sysActivityLogs.status, 'failed'),
          gte(sysActivityLogs.createdAt, since)
        )
      )
      .then((rows) => rows[0]?.count ?? 0),
    db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(sysActivityLogs)
      .where(
        and(
          eq(sysActivityLogs.eventType, 'payments.order.subscription.lifecycle'),
          eq(sysActivityLogs.status, 'warning'),
          gte(sysActivityLogs.createdAt, since)
        )
      )
      .then((rows) => rows[0]?.count ?? 0),
  ]);

  return {
    failed: failedRow,
    warnings: warningRow,
  };
}

async function run() {
  const windowDays = readWindowDays();
  const since = buildSinceDate(windowDays);
  const label = process.env.CANARY_LABEL?.trim() || null;
  const failOnWarning = readBoolean(
    process.env.CANARY_FAIL_ON_WARNING,
    false
  );

  const [
    unresolvedTargets,
    missingTargetIds,
    missingTransactions,
    missingTemplates,
    duplicateAssignments,
    lifecycleFailures,
  ] = await Promise.all([
    countUnresolvedTargets(since),
    countMissingTargetIds(since),
    buildMissingTransactionsSummary(since),
    buildAssignmentTemplateSummary(),
    buildDuplicateAssignmentSummary(),
    buildLifecycleFailureSummary(since),
  ]);

  const criticalIssues: Array<{ key: string; count: number }> = [];

  if (unresolvedTargets > 0) {
    criticalIssues.push({ key: 'unresolved_targets', count: unresolvedTargets });
  }
  if (missingTargetIds.missingTeamTargets > 0) {
    criticalIssues.push({
      key: 'missing_team_targets',
      count: missingTargetIds.missingTeamTargets,
    });
  }
  if (missingTargetIds.missingUserTargets > 0) {
    criticalIssues.push({
      key: 'missing_user_targets',
      count: missingTargetIds.missingUserTargets,
    });
  }
  if (missingTransactions.missingTransactions > 0) {
    criticalIssues.push({
      key: 'missing_transactions',
      count: missingTransactions.missingTransactions,
    });
  }
  if (missingTemplates > 0) {
    criticalIssues.push({
      key: 'assignments_missing_templates',
      count: missingTemplates,
    });
  }
  if (duplicateAssignments.duplicateTargets > 0) {
    criticalIssues.push({
      key: 'duplicate_assignments',
      count: duplicateAssignments.duplicateTargets,
    });
  }

  const status =
    criticalIssues.length > 0
      ? 'critical'
      : lifecycleFailures.failed > 0 || lifecycleFailures.warnings > 0
        ? 'warning'
        : 'ok';

  const notes: string[] = [];
  if (missingTransactions.missingTransactions > 0) {
    notes.push(
      'Missing transactions detected. Check settlement ingestion for recent orders.'
    );
  }
  if (unresolvedTargets > 0 || missingTargetIds.missingTeamTargets > 0) {
    notes.push(
      'Order targets missing. Verify checkout/webhook/admin order writers are setting target_* fields.'
    );
  }
  if (duplicateAssignments.duplicateTargets > 0) {
    notes.push(
      'Duplicate active assignments detected. Inspect subscription_assignments for overlapping effective_to.'
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    label,
    windowDays,
    since: since.toISOString(),
    status,
    criticalIssues,
    notes,
    unresolvedTargets,
    missingTargetIds,
    missingTransactions,
    missingTemplates,
    duplicateAssignments,
    lifecycleFailures,
  };

  const output = JSON.stringify(report, null, 2);
  console.log(output);

  const outputFile = process.env.CANARY_OUTPUT_FILE;
  if (outputFile) {
    writeFileSync(outputFile, output, 'utf8');
  }

  if (status === 'critical' || (status === 'warning' && failOnWarning)) {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error('Canary report failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
