import assert from 'node:assert/strict';
import test from 'node:test';
import { runPaymentOrderSubscriptionLifecycle } from '../../lib/payments/order-subscription-events';

type TeamState = {
  id: number;
  name: string;
};

type TemplateState = {
  id: number;
  name: string;
  targetScope: string;
  categoryKey: string;
  trialPeriodDays: number;
};

function createHarness({
  teams = [],
  templates = []
}: {
  teams?: TeamState[];
  templates?: TemplateState[];
}) {
  const teamMap = new Map<number, TeamState>(teams.map((team) => [team.id, team]));
  const templateMap = new Map<number, TemplateState>(
    templates.map((template) => [template.id, template])
  );
  const logs: Array<Record<string, unknown>> = [];
  const consumeCalls: Array<Record<string, unknown>> = [];
  const trialLedger = new Set<string>();

  const deps = {
    getTeam: async (teamId: number) => teamMap.get(teamId) || null,
    getUser: async () => null,
    getTemplate: async (templateId: number) => templateMap.get(templateId) || null,
    activateSubscriptionAssignment: async () => null,
    replaceWithFallbackSubscriptionAssignment: async () => null,
    consumeSubscriptionTrialUsage: async (input: {
      template: {
        id: number;
        categoryKey: string;
        trialPeriodDays: number;
      };
      target:
        | { targetType: 'team'; targetTeamId: number; targetUserId: null }
        | { targetType: 'user'; targetTeamId: null; targetUserId: number }
        | null;
      categoryKeyOverride?: string | null;
      firstOrderId?: number | null;
    }) => {
      const {
        target,
        firstOrderId,
        categoryKeyOverride,
        template
      } = input;
      const categoryKey = categoryKeyOverride ?? template.categoryKey ?? null;
      consumeCalls.push({
        target,
        categoryKey,
        firstOrderId
      });

      if (!target || !categoryKey) {
        return {
          consumed: false,
          categoryKey: categoryKey ?? null,
          reason: 'invalid_category' as const
        };
      }

      const key =
        target.targetType === 'team'
          ? `team:${target.targetTeamId}:${categoryKey}`
          : `user:${target.targetUserId}:${categoryKey}`;
      if (trialLedger.has(key)) {
        return {
          consumed: false,
          categoryKey,
          reason: 'already_consumed' as const
        };
      }

      trialLedger.add(key);
      return {
        consumed: true,
        categoryKey,
        reason: 'inserted' as const
      };
    },
    createSysActivityLog: async (payload: Record<string, unknown>) => {
      logs.push(payload);
    },
    emitEventAsync: async () => ({
      eventId: 'evt_trial_policy_test',
      handlerCount: 0,
      mode: 'inline' as const
    })
  };

  return {
    deps,
    logs,
    consumeCalls
  };
}

test('trial usage converges across return/webhook and is consumed only once', async () => {
  const { deps, logs, consumeCalls } = createHarness({
    teams: [{ id: 20, name: 'Team Trial' }],
    templates: [
      {
        id: 101,
        name: 'Team Pro',
        targetScope: 'organization',
        categoryKey: 'team.pro',
        trialPeriodDays: 14
      }
    ]
  });

  const payload = {
    orderId: 8001,
    orderType: 'subscription' as const,
    provider: 'stripe',
    status: 'received' as const,
    eventType: 'checkout.return',
    orderSource: 'checkout' as const,
    teamId: 20,
    targetType: 'team' as const,
    targetTeamId: 20,
    subscriptionTemplateId: 101,
    externalPaymentId: 'sub_trial_001',
    metadata: {
      checkoutOrderSubscription: {
        trialEligible: true,
        categoryKey: 'team.pro'
      }
    }
  };

  const first = await runPaymentOrderSubscriptionLifecycle(payload, deps);
  const second = await runPaymentOrderSubscriptionLifecycle(
    {
      ...payload,
      eventType: 'stripe.webhook.subscription.updated',
      orderSource: 'webhook'
    },
    deps
  );

  assert.equal(first.applied, true);
  assert.equal(second.applied, true);
  assert.equal(consumeCalls.length, 2);

  const lifecycleReasons = logs
    .map((entry) => {
      const metadata =
        entry.metadata && typeof entry.metadata === 'object'
          ? (entry.metadata as Record<string, unknown>)
          : null;
      return typeof metadata?.reason === 'string' ? metadata.reason : null;
    })
    .filter((value): value is string => Boolean(value));

  assert.ok(lifecycleReasons.includes('trial_consumed'));
  assert.ok(lifecycleReasons.includes('trial_reuse_blocked'));
});

test('cancel and re-subscribe does not reopen trial for same category/target', async () => {
  const { deps, logs, consumeCalls } = createHarness({
    teams: [{ id: 22, name: 'Team Cancel Flow' }],
    templates: [
      {
        id: 103,
        name: 'Team Pro',
        targetScope: 'organization',
        categoryKey: 'team.pro',
        trialPeriodDays: 14
      }
    ]
  });

  const firstPurchase = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 8201,
      orderType: 'subscription',
      provider: 'paypal',
      status: 'received',
      eventType: 'checkout.completed',
      orderSource: 'checkout',
      teamId: 22,
      targetType: 'team',
      targetTeamId: 22,
      subscriptionTemplateId: 103,
      externalPaymentId: 'sub_trial_cancel_001',
      metadata: {
        checkoutOrderSubscription: {
          trialEligible: true,
          categoryKey: 'team.pro'
        }
      }
    },
    deps
  );

  const canceled = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 8201,
      orderType: 'subscription',
      provider: 'paypal',
      status: 'canceled',
      eventType: 'billing.canceled',
      orderSource: 'webhook',
      teamId: 22,
      targetType: 'team',
      targetTeamId: 22,
      subscriptionTemplateId: 103,
      externalPaymentId: 'sub_trial_cancel_001'
    },
    deps
  );

  const secondPurchase = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 8202,
      orderType: 'subscription',
      provider: 'paypal',
      status: 'received',
      eventType: 'checkout.completed',
      orderSource: 'checkout',
      teamId: 22,
      targetType: 'team',
      targetTeamId: 22,
      subscriptionTemplateId: 103,
      externalPaymentId: 'sub_trial_cancel_002',
      metadata: {
        checkoutOrderSubscription: {
          trialEligible: true,
          categoryKey: 'team.pro'
        }
      }
    },
    deps
  );

  assert.equal(firstPurchase.applied, true);
  assert.equal(canceled.applied, true);
  assert.equal(secondPurchase.applied, true);
  assert.equal(consumeCalls.length, 2);

  const lifecycleReasons = logs
    .map((entry) => {
      const metadata =
        entry.metadata && typeof entry.metadata === 'object'
          ? (entry.metadata as Record<string, unknown>)
          : null;
      return typeof metadata?.reason === 'string' ? metadata.reason : null;
    })
    .filter((value): value is string => Boolean(value));

  assert.ok(lifecycleReasons.includes('trial_consumed'));
  assert.ok(lifecycleReasons.includes('trial_reuse_blocked'));
});

test('trial ledger is not consumed when checkout metadata marks trial as ineligible', async () => {
  const { deps, consumeCalls } = createHarness({
    teams: [{ id: 21, name: 'Team No Trial' }],
    templates: [
      {
        id: 102,
        name: 'Team Pro',
        targetScope: 'organization',
        categoryKey: 'team.pro',
        trialPeriodDays: 14
      }
    ]
  });

  const result = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 8101,
      orderType: 'subscription',
      provider: 'paypal',
      status: 'received',
      eventType: 'checkout.completed',
      orderSource: 'checkout',
      teamId: 21,
      targetType: 'team',
      targetTeamId: 21,
      subscriptionTemplateId: 102,
      externalPaymentId: 'sub_no_trial_001',
      metadata: {
        checkoutOrderSubscription: {
          trialEligible: false,
          categoryKey: 'team.pro'
        }
      }
    },
    deps
  );

  assert.equal(result.applied, true);
  assert.equal(consumeCalls.length, 0);
});
