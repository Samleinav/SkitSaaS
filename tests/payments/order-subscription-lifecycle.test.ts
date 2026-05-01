import assert from 'node:assert/strict';
import test from 'node:test';
import { runPaymentOrderSubscriptionLifecycle } from '../../lib/payments/order-subscription-events';
import type { PaymentOrderStatus } from '../../lib/payments/orders';
import type {
  ActivateSubscriptionAssignmentInput
} from '../../lib/payments/subscription-assignments';
import type {
  SubscriptionTrialTemplateLike,
  SubscriptionTrialUsageTarget
} from '../../lib/payments/subscription-policy';

type TeamState = {
  id: number;
  name: string;
};

type UserState = {
  id: number;
  email: string;
  deletedAt: Date | null;
};

type TemplateState = {
  id: number;
  name: string;
  targetScope: string;
  categoryKey?: string;
  trialPeriodDays?: number;
};

type LifecycleTemplateState = {
  id: number;
  name: string;
  targetScope: string;
  categoryKey: string;
  trialPeriodDays: number;
};

function createHarness({
  teams = [],
  users = [],
  templates = []
}: {
  teams?: TeamState[];
  users?: UserState[];
  templates?: TemplateState[];
}) {
  const teamMap = new Map<number, TeamState>(teams.map((team) => [team.id, team]));
  const userMap = new Map<number, UserState>(users.map((user) => [user.id, user]));
  const templateMap = new Map<number, LifecycleTemplateState>(
    templates.map((template) => [
      template.id,
      {
        ...template,
        categoryKey: template.categoryKey ?? `template.${template.id}`,
        trialPeriodDays: template.trialPeriodDays ?? 0
      }
    ])
  );
  const assignmentActivations: ActivateSubscriptionAssignmentInput[] = [];
  const fallbackAssignments: Array<{
    targetType: 'team' | 'user';
    targetId: number;
    closeStatus?: 'unpaid' | 'canceled';
    sourceOrderId?: number | null;
  }> = [];
  const trialUsageConsumptions: Array<{
    templateId: number;
    targetType: 'team' | 'user' | null;
    categoryKey: string | null;
    firstOrderId: number | null;
  }> = [];
  const logs: Array<Record<string, unknown>> = [];
  const emittedEvents: string[] = [];

  const deps = {
    getTeam: async (teamId: number) => teamMap.get(teamId) || null,
    getUser: async (userId: number) => userMap.get(userId) || null,
    getTemplate: async (templateId: number) => templateMap.get(templateId) || null,
    activateSubscriptionAssignment: async (
      payload: ActivateSubscriptionAssignmentInput
    ) => {
      assignmentActivations.push(payload);
    },
    replaceWithFallbackSubscriptionAssignment: async (payload: {
      targetType: 'team' | 'user';
      targetId: number;
      closeStatus?: 'unpaid' | 'canceled';
      sourceOrderId?: number | null;
    }) => {
      fallbackAssignments.push(payload);
    },
    consumeSubscriptionTrialUsage: async ({
      template,
      target,
      firstOrderId = null
    }: {
      template: SubscriptionTrialTemplateLike;
      target: SubscriptionTrialUsageTarget | null;
      firstOrderId?: number | null;
    }) => {
      trialUsageConsumptions.push({
        templateId: template.id,
        targetType: target?.targetType ?? null,
        categoryKey: template.categoryKey,
        firstOrderId
      });

      return {
        consumed: true,
        categoryKey: template.categoryKey,
        reason: 'inserted' as const
      };
    },
    createSysActivityLog: async (payload: Record<string, unknown>) => {
      logs.push(payload);
    },
    emitEventAsync: async (hook: string) => {
      emittedEvents.push(hook);
      return {
        eventId: 'evt_test_lifecycle',
        handlerCount: 0,
        mode: 'inline' as const
      };
    }
  };

  return {
    assignmentActivations,
    fallbackAssignments,
    trialUsageConsumptions,
    logs,
    emittedEvents,
    deps
  };
}

test('order/payment status changes trigger correct lifecycle events for organization target', async () => {
  const {
    assignmentActivations,
    fallbackAssignments,
    logs,
    deps
  } =
    createHarness({
      teams: [
        {
          id: 10,
          name: 'Org A'
        }
      ],
      templates: [
        {
          id: 101,
          name: 'Pro',
          targetScope: 'organization'
        }
      ]
    });

  const applyOrderStatus = async (status: PaymentOrderStatus) =>
    runPaymentOrderSubscriptionLifecycle(
      {
        orderId: 9001,
        provider: 'stripe',
        status,
        eventType: `test.order.${status}`,
        orderSource: 'dashboard',
        triggerSource: '/tests/payments/order-subscription-lifecycle.test.ts',
        teamId: 10,
        subscriptionTemplateId: 101,
        planName: 'Pro',
        providerPlanId: 'price_test_123',
        externalPaymentId: 'sub_test_123',
        metadata: {
          checkoutContext: {
            providerMetadata: {
              stripe: {
                currentPeriodStart: '2026-02-01T00:00:00.000Z',
                currentPeriodEnd: '2026-03-01T00:00:00.000Z',
                trialEndsAt: '2026-02-08T00:00:00.000Z',
                cancelAtPeriodEnd: true,
                canceledAt: '2026-02-15T00:00:00.000Z'
              }
            }
          }
        }
      },
      deps
    );

  const pendingResult = await applyOrderStatus('pending');
  assert.equal(pendingResult.applied, false);
  assert.equal(pendingResult.reason, 'status_not_actionable');
  assert.equal(logs.length, 0);
  assert.equal(assignmentActivations.length, 0);
  assert.equal(fallbackAssignments.length, 0);

  const receivedResult = await applyOrderStatus('received');
  assert.equal(receivedResult.applied, true);
  assert.equal(receivedResult.reason, 'team_activated');
  assert.equal(logs.length, 1);
  assert.equal(assignmentActivations.length, 1);
  assert.deepEqual(assignmentActivations[0], {
    targetType: 'team',
    targetId: 10,
    subscriptionTemplateId: 101,
    paymentProvider: 'stripe',
    providerReferenceId: 'sub_test_123',
    providerPlanId: 'price_test_123',
    status: 'active',
    planName: 'Pro',
    currentPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
    trialEndsAt: new Date('2026-02-08T00:00:00.000Z'),
    cancelAtPeriodEnd: true,
    canceledAt: new Date('2026-02-15T00:00:00.000Z'),
    sourceOrderId: 9001
  });

  const failedResult = await applyOrderStatus('failed');
  assert.equal(failedResult.applied, true);
  assert.equal(failedResult.reason, 'team_suspended');
  assert.equal(logs.length, 2);
  assert.equal(fallbackAssignments.length, 1);
  assert.deepEqual(fallbackAssignments[0], {
    targetType: 'team',
    targetId: 10,
    closeStatus: 'unpaid',
    sourceOrderId: 9001
  });

  const canceledResult = await applyOrderStatus('canceled');
  assert.equal(canceledResult.applied, true);
  assert.equal(canceledResult.reason, 'team_suspended');
  assert.equal(logs.length, 3);
  assert.equal(fallbackAssignments.length, 2);
  assert.deepEqual(fallbackAssignments[1], {
    targetType: 'team',
    targetId: 10,
    closeStatus: 'canceled',
    sourceOrderId: 9001
  });
});

test('explicit user order/payment status changes activate and fall back user subscription', async () => {
  const {
    assignmentActivations,
    fallbackAssignments,
    logs,
    deps
  } =
    createHarness({
      users: [
        {
          id: 77,
          email: 'user77@test.com',
          deletedAt: null
        }
      ],
      templates: [
        {
          id: 205,
          name: 'Solo Pro',
          targetScope: 'user'
        }
      ]
    });

  const applyUserOrderStatus = async (status: PaymentOrderStatus) =>
    runPaymentOrderSubscriptionLifecycle(
      {
        orderId: 7007,
        provider: 'system',
        status,
        eventType: `test.user-order.${status}`,
        orderSource: 'system',
        targetType: 'user',
        targetUserId: 77,
        subscriptionTemplateId: 205,
        metadata: {
          checkoutContext: {
            providerMetadata: {
              system: {
                targetType: 'user',
                userId: 77
              }
            }
          }
        }
      },
      deps
    );

  const receivedResult = await applyUserOrderStatus('received');
  assert.equal(receivedResult.applied, true);
  assert.equal(receivedResult.reason, 'user_activated');
  assert.equal(logs.length, 1);
  assert.equal(assignmentActivations.length, 1);
  assert.deepEqual(assignmentActivations[0], {
    targetType: 'user',
    targetId: 77,
    subscriptionTemplateId: 205,
    paymentProvider: null,
    providerReferenceId: null,
    providerPlanId: null,
    status: 'active',
    planName: 'Solo Pro',
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    cancelAtPeriodEnd: null,
    canceledAt: null,
    sourceOrderId: 7007
  });

  const failedResult = await applyUserOrderStatus('failed');
  assert.equal(failedResult.applied, true);
  assert.equal(failedResult.reason, 'user_suspended');
  assert.equal(logs.length, 2);
  assert.equal(fallbackAssignments.length, 1);
  assert.deepEqual(fallbackAssignments[0], {
    targetType: 'user',
    targetId: 77,
    closeStatus: 'unpaid',
    sourceOrderId: 7007
  });
});

test('trialing provider subscriptions activate trialing assignments', async () => {
  const { assignmentActivations, deps } = createHarness({
    users: [
      {
        id: 31,
        email: 'trial-user@test.com',
        deletedAt: null
      }
    ],
    templates: [
      {
        id: 311,
        name: 'Trial Solo',
        targetScope: 'user',
        trialPeriodDays: 14
      }
    ]
  });

  const result = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 3110,
      provider: 'stripe',
      status: 'received',
      eventType: 'checkout.completed',
      orderSource: 'checkout',
      targetType: 'user',
      targetUserId: 31,
      subscriptionTemplateId: 311,
      externalPaymentId: 'sub_trialing_311',
      metadata: {
        subscriptionStatus: 'trialing',
        checkoutContext: {
          providerMetadata: {
            stripe: {
              subscriptionStatus: 'trialing',
              trialEndsAt: '2026-04-14T00:00:00.000Z'
            }
          }
        }
      }
    },
    deps
  );

  assert.equal(result.applied, true);
  assert.equal(result.reason, 'user_activated');
  assert.equal(assignmentActivations.length, 1);
  assert.equal(assignmentActivations[0].status, 'trialing');
  assert.deepEqual(
    assignmentActivations[0].trialEndsAt,
    new Date('2026-04-14T00:00:00.000Z')
  );
});

test('failed organization lifecycle can use fallback assignment writer', async () => {
  const { deps } = createHarness({
    teams: [
      {
        id: 22,
        name: 'Fallback Org'
      }
    ],
    templates: [
      {
        id: 302,
        name: 'Basic',
        targetScope: 'organization'
      }
    ]
  });
  const fallbackCalls: Array<{
    targetType: 'team' | 'user';
    targetId: number;
    closeStatus?: 'unpaid' | 'canceled';
    sourceOrderId?: number | null;
  }> = [];

  const result = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 9012,
      provider: 'stripe',
      status: 'failed',
      eventType: 'test.order.failed',
      orderSource: 'dashboard',
      triggerSource: '/tests/payments/order-subscription-lifecycle.test.ts',
      teamId: 22,
      subscriptionTemplateId: 302,
      planName: 'Basic',
      providerPlanId: 'price_basic_123',
      externalPaymentId: 'sub_basic_123'
    },
    {
      ...deps,
      replaceWithFallbackSubscriptionAssignment: async (payload) => {
        fallbackCalls.push(payload);
      }
    }
  );

  assert.equal(result.applied, true);
  assert.equal(result.reason, 'team_suspended');
  assert.deepEqual(fallbackCalls, [
    {
      targetType: 'team',
      targetId: 22,
      closeStatus: 'unpaid',
      sourceOrderId: 9012
    }
  ]);
});

test('non-supported status like refunded does not mutate subscription state', async () => {
  const { assignmentActivations, fallbackAssignments, logs, deps } =
    createHarness({
      teams: [
        {
          id: 40,
          name: 'Org B'
        }
      ],
      templates: [
        {
          id: 9,
          name: 'Starter',
          targetScope: 'organization'
        }
      ]
    });

  const refundedResult = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 4004,
      provider: 'stripe',
      status: 'refunded' as unknown as PaymentOrderStatus,
      eventType: 'test.order.refunded',
      orderSource: 'webhook',
      teamId: 40,
      subscriptionTemplateId: 9,
      externalPaymentId: 'sub_live'
    },
    deps
  );

  assert.equal(refundedResult.applied, false);
  assert.equal(refundedResult.reason, 'status_not_actionable');
  assert.equal(logs.length, 0);
  assert.equal(assignmentActivations.length, 0);
  assert.equal(fallbackAssignments.length, 0);
});

test('one_time order type never triggers subscription lifecycle projection', async () => {
  const { assignmentActivations, fallbackAssignments, logs, deps } =
    createHarness({
      teams: [
        {
          id: 55,
          name: 'Org One-Time'
        }
      ],
      templates: [
        {
          id: 404,
          name: 'One-Time Product',
          targetScope: 'organization'
        }
      ]
    });

  const result = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 5050,
      orderType: 'one_time',
      provider: 'stripe',
      status: 'received',
      eventType: 'checkout.completed',
      orderSource: 'checkout',
      teamId: 55,
      subscriptionTemplateId: 404,
      externalPaymentId: 'pi_onetime_1'
    },
    deps
  );

  assert.equal(result.applied, false);
  assert.equal(result.reason, 'order_type_not_subscription');
  assert.equal(logs.length, 0);
  assert.equal(assignmentActivations.length, 0);
  assert.equal(fallbackAssignments.length, 0);
});

test('scheduled change requests skip immediate activation', async () => {
  const { assignmentActivations, fallbackAssignments, logs, deps } =
    createHarness({
      teams: [
        {
          id: 88,
          name: 'Org Scheduled'
        }
      ],
      templates: [
        {
          id: 505,
          name: 'Enterprise',
          targetScope: 'organization'
        }
      ]
    });

  const result = await runPaymentOrderSubscriptionLifecycle(
    {
      orderId: 9090,
      provider: 'stripe',
      status: 'received',
      eventType: 'checkout.completed',
      orderSource: 'checkout',
      teamId: 88,
      subscriptionTemplateId: 505,
      externalPaymentId: 'sub_sched_1',
      metadata: {
        subscriptionChange: {
          mode: 'period_end',
          requestId: 123,
          effectiveAt: '2026-03-01T00:00:00.000Z'
        }
      }
    },
    deps
  );

  assert.equal(result.applied, false);
  assert.equal(result.reason, 'change_scheduled');
  assert.equal(assignmentActivations.length, 0);
  assert.equal(fallbackAssignments.length, 0);
  assert.equal(logs.length, 1);
});
