type PaymentOrderMetadataRecord = Record<string, unknown>;

function asRecord(value: unknown): PaymentOrderMetadataRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as PaymentOrderMetadataRecord;
}

function parsePositiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeTargetType(value: unknown): 'team' | 'user' | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'organization') {
    return 'team';
  }

  if (normalized === 'team' || normalized === 'user') {
    return normalized;
  }

  return null;
}

export function parsePaymentOrderMetadata(
  metadata: unknown
): PaymentOrderMetadataRecord | null {
  if (metadata === null || metadata === undefined) {
    return null;
  }

  if (typeof metadata === 'string') {
    try {
      return asRecord(JSON.parse(metadata));
    } catch {
      return null;
    }
  }

  return asRecord(metadata);
}

export type PaymentOrderResolvedTarget = {
  targetType: 'team' | 'user' | null;
  teamId: number | null;
  userId: number | null;
};

export function resolvePaymentOrderTarget(
  metadata: unknown
): PaymentOrderResolvedTarget {
  const payload = parsePaymentOrderMetadata(metadata);
  const checkoutContext = asRecord(payload?.checkoutContext);
  const providerMetadata = asRecord(checkoutContext?.providerMetadata);
  const systemProviderMetadata = asRecord(providerMetadata?.system);

  const teamId = parsePositiveInt(
    systemProviderMetadata?.teamId ?? payload?.teamId
  );
  const userId = parsePositiveInt(
    systemProviderMetadata?.userId ?? payload?.userId
  );
  const hintedTargetType = normalizeTargetType(
    systemProviderMetadata?.targetType ?? payload?.targetType
  );

  if (hintedTargetType === 'user' && userId) {
    return {
      targetType: 'user',
      teamId,
      userId
    };
  }

  if (hintedTargetType === 'team' && teamId) {
    return {
      targetType: 'team',
      teamId,
      userId
    };
  }

  if (teamId) {
    return {
      targetType: 'team',
      teamId,
      userId
    };
  }

  if (userId) {
    return {
      targetType: 'user',
      teamId,
      userId
    };
  }

  return {
    targetType: null,
    teamId: null,
    userId: null
  };
}

