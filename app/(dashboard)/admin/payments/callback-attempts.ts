export type AdminCheckoutCallbackAttemptRow = {
  id: number;
  checkoutOrderId: number | null;
  checkoutToken: string | null;
  paymentMethodId: string;
  provider: string;
  ownerType: string;
  moduleId: string | null;
  orderType: string | null;
  source: string;
  eventType: string;
  status: string;
  teamId: number | null;
  targetType: string | null;
  targetTeamId: number | null;
  targetUserId: number | null;
  providerSessionId: string | null;
  providerReferenceId: string | null;
  externalOrderId: string | null;
  externalPaymentId: string | null;
  message: string | null;
  metadata: string | null;
  createdAt: Date;
  teamName: string | null;
};

export type CheckoutCallbackOutcome =
  | 'replayed'
  | 'provider_pending'
  | 'failed'
  | 'ignored'
  | 'succeeded'
  | 'unknown';

export function getCheckoutCallbackOutcome(
  eventType: string
): CheckoutCallbackOutcome {
  if (eventType.endsWith('_replayed')) {
    return 'replayed';
  }

  if (eventType.endsWith('_provider_pending')) {
    return 'provider_pending';
  }

  if (eventType.endsWith('_failed')) {
    return 'failed';
  }

  if (eventType.endsWith('_ignored')) {
    return 'ignored';
  }

  if (eventType.endsWith('_succeeded')) {
    return 'succeeded';
  }

  return 'unknown';
}

export function getCheckoutCallbackMetrics(
  rows: AdminCheckoutCallbackAttemptRow[]
) {
  return rows.reduce(
    (acc, row) => {
      const outcome = getCheckoutCallbackOutcome(row.eventType);
      acc.total += 1;

      if (outcome === 'replayed') {
        acc.replayed += 1;
      }

      if (outcome === 'provider_pending') {
        acc.providerPending += 1;
      }

      if (outcome === 'failed') {
        acc.failed += 1;
      }

      return acc;
    },
    {
      total: 0,
      replayed: 0,
      providerPending: 0,
      failed: 0
    }
  );
}
