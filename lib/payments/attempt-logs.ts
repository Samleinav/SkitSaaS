import { db } from '@/lib/db/drizzle';
import { checkoutPaymentAttemptLogs } from '@/lib/db/schema';

type CheckoutPaymentAttemptOwnerType = 'core' | 'module' | 'unknown';
type CheckoutPaymentAttemptStatus = 'info' | 'success' | 'warning' | 'failed';
type CheckoutPaymentAttemptOrderType = 'subscription' | 'one_time';
type CheckoutPaymentAttemptTargetType = 'team' | 'user';

export type PersistedCheckoutPaymentAttemptLogEntry = {
  checkoutOrderId: number | null;
  checkoutToken: string | null;
  paymentMethodId: string;
  provider: string;
  ownerType: CheckoutPaymentAttemptOwnerType;
  moduleId: string | null;
  orderType: CheckoutPaymentAttemptOrderType | null;
  source: string;
  eventType: string;
  status: CheckoutPaymentAttemptStatus;
  teamId: number | null;
  targetType: CheckoutPaymentAttemptTargetType | null;
  targetTeamId: number | null;
  targetUserId: number | null;
  providerSessionId: string | null;
  providerReferenceId: string | null;
  externalOrderId: string | null;
  externalPaymentId: string | null;
  message: string | null;
  metadata: string | null;
};

type CheckoutPaymentAttemptLogWriter = (
  values: PersistedCheckoutPaymentAttemptLogEntry
) => Promise<void> | void;

let configuredCheckoutPaymentAttemptLogWriter: CheckoutPaymentAttemptLogWriter | null =
  null;

export type CreateCheckoutPaymentAttemptLogInput = {
  checkoutOrderId?: number | null;
  checkoutToken?: string | null;
  paymentMethodId: string;
  provider?: string | null;
  ownerType?: CheckoutPaymentAttemptOwnerType | string | null;
  moduleId?: string | null;
  orderType?: CheckoutPaymentAttemptOrderType | string | null;
  source?: string | null;
  eventType: string;
  status?: CheckoutPaymentAttemptStatus | string | null;
  teamId?: number | null;
  targetType?: CheckoutPaymentAttemptTargetType | string | null;
  targetTeamId?: number | null;
  targetUserId?: number | null;
  providerSessionId?: string | null;
  providerReferenceId?: string | null;
  externalOrderId?: string | null;
  externalPaymentId?: string | null;
  message?: string | null;
  metadata?: unknown;
};

export function configureCheckoutPaymentAttemptLogWriter(
  writer: CheckoutPaymentAttemptLogWriter | null
) {
  configuredCheckoutPaymentAttemptLogWriter = writer;
}

function normalizeText(
  value: string | number | null | undefined,
  maxLength: number
) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizePositiveInt(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeOwnerType(
  ownerType: CheckoutPaymentAttemptOwnerType | string | null | undefined
): CheckoutPaymentAttemptOwnerType {
  if (ownerType === 'core' || ownerType === 'module' || ownerType === 'unknown') {
    return ownerType;
  }

  return 'unknown';
}

function normalizeOrderType(
  orderType: CheckoutPaymentAttemptOrderType | string | null | undefined
): CheckoutPaymentAttemptOrderType | null {
  if (orderType === 'subscription' || orderType === 'one_time') {
    return orderType;
  }

  return null;
}

function normalizeStatus(
  status: CheckoutPaymentAttemptStatus | string | null | undefined
): CheckoutPaymentAttemptStatus {
  if (
    status === 'success' ||
    status === 'warning' ||
    status === 'failed' ||
    status === 'info'
  ) {
    return status;
  }

  return 'info';
}

function normalizeTargetType(
  targetType: CheckoutPaymentAttemptTargetType | string | null | undefined
): CheckoutPaymentAttemptTargetType | null {
  if (targetType === 'team' || targetType === 'user') {
    return targetType;
  }

  return null;
}

function normalizeMetadata(metadata: unknown) {
  if (metadata === undefined) {
    return null;
  }

  try {
    return JSON.stringify(metadata).slice(0, 12000);
  } catch {
    return null;
  }
}

export async function createCheckoutPaymentAttemptLog({
  checkoutOrderId = null,
  checkoutToken = null,
  paymentMethodId,
  provider = 'unknown',
  ownerType = 'unknown',
  moduleId = null,
  orderType = null,
  source = 'system',
  eventType,
  status = 'info',
  teamId = null,
  targetType = null,
  targetTeamId = null,
  targetUserId = null,
  providerSessionId = null,
  providerReferenceId = null,
  externalOrderId = null,
  externalPaymentId = null,
  message = null,
  metadata
}: CreateCheckoutPaymentAttemptLogInput) {
  const safePaymentMethodId = normalizeText(paymentMethodId, 60);
  const safeProvider = normalizeText(provider, 30);
  const safeEventType = normalizeText(eventType, 60);
  const normalizedTargetType = normalizeTargetType(targetType);

  if (!safePaymentMethodId || !safeProvider || !safeEventType) {
    return;
  }

  const entry: PersistedCheckoutPaymentAttemptLogEntry = {
    checkoutOrderId: normalizePositiveInt(checkoutOrderId),
    checkoutToken: normalizeText(checkoutToken, 120),
    paymentMethodId: safePaymentMethodId,
    provider: safeProvider,
    ownerType: normalizeOwnerType(ownerType),
    moduleId: normalizeText(moduleId, 120),
    orderType: normalizeOrderType(orderType),
    source: normalizeText(source, 30) || 'system',
    eventType: safeEventType,
    status: normalizeStatus(status),
    teamId: normalizePositiveInt(teamId),
    targetType: normalizedTargetType,
    targetTeamId:
      normalizedTargetType === 'team' ? normalizePositiveInt(targetTeamId) : null,
    targetUserId:
      normalizedTargetType === 'user' ? normalizePositiveInt(targetUserId) : null,
    providerSessionId: normalizeText(providerSessionId, 255),
    providerReferenceId: normalizeText(providerReferenceId, 255),
    externalOrderId: normalizeText(externalOrderId, 255),
    externalPaymentId: normalizeText(externalPaymentId, 255),
    message: normalizeText(message, 2000),
    metadata: normalizeMetadata(metadata)
  };

  try {
    if (configuredCheckoutPaymentAttemptLogWriter) {
      await configuredCheckoutPaymentAttemptLogWriter(entry);
      return;
    }

    await db.insert(checkoutPaymentAttemptLogs).values(entry);
  } catch (error) {
    console.error('Unable to persist checkout payment attempt log:', {
      eventType: entry.eventType,
      paymentMethodId: entry.paymentMethodId,
      checkoutOrderId: entry.checkoutOrderId,
      error
    });
  }
}
