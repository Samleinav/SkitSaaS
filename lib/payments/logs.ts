import { db } from '@/lib/db/drizzle';
import { paymentLogs } from '@/lib/db/schema';

type PaymentLogStatus = 'info' | 'success' | 'failed';

type CreatePaymentLogInput = {
  provider: string;
  eventType: string;
  status?: PaymentLogStatus;
  teamId?: number | null;
  externalId?: string | null;
  amount?: number | null;
  currency?: string | null;
  message?: string | null;
  payload?: unknown;
};

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

function normalizeAmount(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value);
}

function normalizePayload(payload: unknown) {
  if (payload === undefined) {
    return null;
  }

  try {
    return JSON.stringify(payload).slice(0, 8000);
  } catch {
    return null;
  }
}

export async function createPaymentLog({
  provider,
  eventType,
  status = 'info',
  teamId = null,
  externalId = null,
  amount = null,
  currency = null,
  message = null,
  payload
}: CreatePaymentLogInput) {
  const safeProvider = normalizeText(provider, 30);
  const safeEventType = normalizeText(eventType, 120);

  if (!safeProvider || !safeEventType) {
    return;
  }

  const safeStatus: PaymentLogStatus =
    status === 'success' || status === 'failed' ? status : 'info';

  try {
    await db.insert(paymentLogs).values({
      provider: safeProvider,
      eventType: safeEventType,
      status: safeStatus,
      teamId: teamId && teamId > 0 ? teamId : null,
      externalId: normalizeText(externalId, 255),
      amount: normalizeAmount(amount),
      currency: normalizeText(currency, 10)?.toUpperCase() || null,
      message: normalizeText(message, 1000),
      payload: normalizePayload(payload)
    });
  } catch (error) {
    console.error('Unable to persist payment log:', error);
  }
}
