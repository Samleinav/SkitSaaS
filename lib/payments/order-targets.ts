import { resolvePaymentOrderTarget } from './order-metadata';

export type SubscriptionOrderTargetInput = {
  teamId: number | null;
  metadata: unknown;
};

export type SubscriptionOrderTargetIds = {
  teamIds: number[];
  userIds: number[];
};

export function collectSubscriptionOrderTargetIds(
  orders: SubscriptionOrderTargetInput[]
): SubscriptionOrderTargetIds {
  const teamIds = new Set<number>();
  const userIds = new Set<number>();

  for (const order of orders) {
    if (
      typeof order.teamId === 'number' &&
      Number.isInteger(order.teamId) &&
      order.teamId > 0
    ) {
      teamIds.add(order.teamId);
    }

    const resolvedTarget = resolvePaymentOrderTarget(order.metadata);

    if (resolvedTarget.teamId) {
      teamIds.add(resolvedTarget.teamId);
    }

    if (resolvedTarget.userId) {
      userIds.add(resolvedTarget.userId);
    }
  }

  return {
    teamIds: Array.from(teamIds),
    userIds: Array.from(userIds)
  };
}
