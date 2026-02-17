import type { OneTimeFulfillmentStatus } from './types';

export type OneTimeFulfillmentTransitionResult = {
  nextStatus: OneTimeFulfillmentStatus;
  transitionApplied: boolean;
  reason: string;
};

export function resolveOneTimeFulfillmentStatusTransition({
  currentStatus,
  requestedStatus
}: {
  currentStatus: OneTimeFulfillmentStatus;
  requestedStatus: Exclude<OneTimeFulfillmentStatus, 'pending'>;
}): OneTimeFulfillmentTransitionResult {
  if (currentStatus === requestedStatus) {
    return {
      nextStatus: currentStatus,
      transitionApplied: false,
      reason: 'status_unchanged'
    };
  }

  if (currentStatus === 'refunded') {
    return {
      nextStatus: currentStatus,
      transitionApplied: false,
      reason: 'already_refunded'
    };
  }

  if (requestedStatus === 'refunded') {
    if (currentStatus === 'paid') {
      return {
        nextStatus: 'refunded',
        transitionApplied: true,
        reason: 'refund_applied'
      };
    }

    return {
      nextStatus: currentStatus,
      transitionApplied: false,
      reason: 'refund_without_paid_state'
    };
  }

  if (requestedStatus === 'paid') {
    return {
      nextStatus: 'paid',
      transitionApplied: true,
      reason: 'payment_confirmed'
    };
  }

  if (requestedStatus === 'failed') {
    if (currentStatus === 'paid') {
      return {
        nextStatus: currentStatus,
        transitionApplied: false,
        reason: 'failed_ignored_after_paid'
      };
    }

    if (currentStatus === 'canceled') {
      return {
        nextStatus: currentStatus,
        transitionApplied: false,
        reason: 'failed_ignored_after_canceled'
      };
    }

    return {
      nextStatus: 'failed',
      transitionApplied: true,
      reason: 'failed_applied'
    };
  }

  if (currentStatus === 'paid') {
    return {
      nextStatus: currentStatus,
      transitionApplied: false,
      reason: 'canceled_ignored_after_paid'
    };
  }

  return {
    nextStatus: 'canceled',
    transitionApplied: true,
    reason: 'canceled_applied'
  };
}
