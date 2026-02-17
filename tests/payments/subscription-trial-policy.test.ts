import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySubscriptionPlanRelation,
  consumeSubscriptionTrialUsage,
  isSubscriptionTemplateTrialEligible,
  normalizeSubscriptionPlanRelation,
  normalizeSubscriptionCategoryKey,
  resolveSubscriptionChangeReasonByPlanRelation,
  resolveSubscriptionTrialUsageTarget
} from '../../lib/payments/subscription-policy';

function buildInMemoryTrialLedger() {
  const entries = new Set<string>();
  let sequence = 1;

  return {
    deps: {
      async findTrialUsage({
        target,
        categoryKey
      }: {
        target: { targetType: 'team'; targetTeamId: number; targetUserId: null } | {
          targetType: 'user';
          targetTeamId: null;
          targetUserId: number;
        };
        categoryKey: string;
      }) {
        const key =
          target.targetType === 'team'
            ? `team:${target.targetTeamId}:${categoryKey}`
            : `user:${target.targetUserId}:${categoryKey}`;
        return entries.has(key) ? { id: sequence } : null;
      },
      async insertTrialUsage({
        target,
        categoryKey
      }: {
        target: { targetType: 'team'; targetTeamId: number; targetUserId: null } | {
          targetType: 'user';
          targetTeamId: null;
          targetUserId: number;
        };
        categoryKey: string;
        firstTemplateId: number | null;
        firstOrderId: number | null;
        consumedAt: Date;
      }) {
        const key =
          target.targetType === 'team'
            ? `team:${target.targetTeamId}:${categoryKey}`
            : `user:${target.targetUserId}:${categoryKey}`;
        if (entries.has(key)) {
          return 'exists' as const;
        }

        entries.add(key);
        sequence += 1;
        return 'inserted' as const;
      }
    }
  };
}

test('normalizeSubscriptionCategoryKey normalizes and trims values', () => {
  assert.equal(
    normalizeSubscriptionCategoryKey(' Team Pro++ Annual '),
    'team.pro.annual'
  );
  assert.equal(normalizeSubscriptionCategoryKey(''), null);
  assert.equal(
    normalizeSubscriptionCategoryKey(null, 42),
    'legacy.template.42'
  );
});

test('classifySubscriptionPlanRelation resolves upgrade, downgrade and lateral changes', () => {
  const current = {
    id: 10,
    targetScope: 'organization',
    categoryKey: 'team.pro',
    hierarchyRank: 1,
    trialPeriodDays: 7
  };

  assert.equal(
    classifySubscriptionPlanRelation({
      currentTemplate: current,
      nextTemplate: {
        ...current,
        id: 10
      }
    }),
    'same_template'
  );

  assert.equal(
    classifySubscriptionPlanRelation({
      currentTemplate: current,
      nextTemplate: {
        ...current,
        id: 11,
        hierarchyRank: 2
      }
    }),
    'upgrade'
  );

  assert.equal(
    classifySubscriptionPlanRelation({
      currentTemplate: current,
      nextTemplate: {
        ...current,
        id: 12,
        hierarchyRank: 0
      }
    }),
    'downgrade'
  );

  assert.equal(
    classifySubscriptionPlanRelation({
      currentTemplate: current,
      nextTemplate: {
        ...current,
        id: 13,
        hierarchyRank: 1
      }
    }),
    'lateral_change'
  );

  assert.equal(
    classifySubscriptionPlanRelation({
      currentTemplate: current,
      nextTemplate: {
        ...current,
        id: 14,
        categoryKey: 'team.enterprise',
        hierarchyRank: 5
      }
    }),
    'new_purchase'
  );
});

test('trial eligibility and consumption are idempotent per category and target', async () => {
  const ledger = buildInMemoryTrialLedger();
  const template = {
    id: 50,
    targetScope: 'organization',
    categoryKey: 'team.pro',
    hierarchyRank: 1,
    trialPeriodDays: 14
  };
  const target = resolveSubscriptionTrialUsageTarget({
    targetType: 'team',
    targetTeamId: 9
  });

  assert.ok(target);
  assert.equal(target?.targetType, 'team');

  const firstEligibility = await isSubscriptionTemplateTrialEligible(
    {
      template,
      target
    },
    ledger.deps
  );
  assert.equal(firstEligibility.trialEligible, true);
  assert.equal(firstEligibility.categoryKey, 'team.pro');

  const firstConsume = await consumeSubscriptionTrialUsage(
    {
      template,
      target,
      firstOrderId: 1001
    },
    ledger.deps
  );
  assert.equal(firstConsume.consumed, true);
  assert.equal(firstConsume.reason, 'inserted');

  const secondConsume = await consumeSubscriptionTrialUsage(
    {
      template,
      target,
      firstOrderId: 1002
    },
    ledger.deps
  );
  assert.equal(secondConsume.consumed, false);
  assert.equal(secondConsume.reason, 'already_consumed');

  const secondEligibility = await isSubscriptionTemplateTrialEligible(
    {
      template,
      target
    },
    ledger.deps
  );
  assert.equal(secondEligibility.trialEligible, false);
});

test('templates without trial days are never eligible nor consumable', async () => {
  const ledger = buildInMemoryTrialLedger();
  const template = {
    id: 60,
    targetScope: 'organization',
    categoryKey: 'team.basic',
    hierarchyRank: 0,
    trialPeriodDays: 0
  };
  const target = resolveSubscriptionTrialUsageTarget({
    targetType: 'team',
    targetTeamId: 9
  });

  const eligibility = await isSubscriptionTemplateTrialEligible(
    {
      template,
      target
    },
    ledger.deps
  );
  assert.equal(eligibility.trialEligible, false);

  const consume = await consumeSubscriptionTrialUsage(
    {
      template,
      target,
      firstOrderId: 2001
    },
    ledger.deps
  );
  assert.equal(consume.consumed, false);
  assert.equal(consume.reason, 'not_applicable');
});

test('plan relation maps to expected subscription change reason', () => {
  assert.equal(
    normalizeSubscriptionPlanRelation('upgrade'),
    'upgrade'
  );
  assert.equal(
    normalizeSubscriptionPlanRelation('invalid'),
    null
  );

  assert.equal(resolveSubscriptionChangeReasonByPlanRelation('upgrade'), 'upgrade');
  assert.equal(
    resolveSubscriptionChangeReasonByPlanRelation('downgrade'),
    'downgrade'
  );
  assert.equal(
    resolveSubscriptionChangeReasonByPlanRelation('lateral_change'),
    'plan_change'
  );
  assert.equal(
    resolveSubscriptionChangeReasonByPlanRelation(null),
    'plan_change'
  );
});
