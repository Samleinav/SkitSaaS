import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { paymentTransactions } from '@/lib/db/schema';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import type { PaymentOrderStatus } from './orders';

type PaymentTransactionStatus = 'pending' | 'succeeded' | 'failed' | 'reversed';

type PaymentSettlementTransactionRecord = {
  id: number;
  orderId: number | null;
  provider: string;
  transactionType: string;
  status: string;
  amount: number | null;
  currency: string | null;
  externalTransactionId: string | null;
  providerEventId: string | null;
  dedupeKey: string | null;
  externalInvoiceId: string | null;
  payload: string | null;
  metadata: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentSettlementTransactionPersistOutcome =
  | 'skipped'
  | 'inserted'
  | 'updated'
  | 'unchanged'
  | 'failed';

export type PaymentSettlementTransactionPersistResult = {
  transaction: PaymentSettlementTransactionRecord | null;
  outcome: PaymentSettlementTransactionPersistOutcome;
};

export type PaymentSettlementTransactionInput = {
  orderId?: number | null;
  provider: string;
  orderStatus: PaymentOrderStatus;
  amount?: number | null;
  currency?: string | null;
  externalTransactionId?: string | null;
  providerEventId?: string | null;
  externalInvoiceId?: string | null;
  dedupeKey?: string | null;
  payload?: unknown;
  metadata?: unknown;
  occurredAt?: Date | null;
};

export type PaymentTransactionReplayPayload = {
  operation: 'upsert_sale';
  input: PaymentSettlementTransactionInput;
};

const paymentSettlementTransactionSelectFields = {
  id: paymentTransactions.id,
  orderId: paymentTransactions.orderId,
  provider: paymentTransactions.provider,
  transactionType: paymentTransactions.transactionType,
  status: paymentTransactions.status,
  amount: paymentTransactions.amount,
  currency: paymentTransactions.currency,
  externalTransactionId: paymentTransactions.externalTransactionId,
  providerEventId: paymentTransactions.providerEventId,
  dedupeKey: paymentTransactions.dedupeKey,
  externalInvoiceId: paymentTransactions.externalInvoiceId,
  payload: paymentTransactions.payload,
  metadata: paymentTransactions.metadata,
  occurredAt: paymentTransactions.occurredAt,
  createdAt: paymentTransactions.createdAt,
  updatedAt: paymentTransactions.updatedAt,
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

function normalizePositiveInt(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeAmount(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value);
}

function normalizeMetadata(value: unknown) {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value).slice(0, 12000);
  } catch {
    return null;
  }
}

function formatErrorReason(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 200);
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim().slice(0, 200);
  }

  return 'unknown_error';
}

export function isSettlementPaymentOrderStatus(status: PaymentOrderStatus) {
  return status === 'received' || status === 'failed' || status === 'canceled';
}

function mapOrderStatusToTransactionStatus(
  orderStatus: PaymentOrderStatus
): PaymentTransactionStatus {
  if (orderStatus === 'received') {
    return 'succeeded';
  }

  if (orderStatus === 'failed') {
    return 'failed';
  }

  if (orderStatus === 'canceled') {
    return 'reversed';
  }

  return 'pending';
}

function buildFallbackDedupeKey(input: {
  provider: string;
  orderId: number | null;
  providerEventId: string | null;
  externalTransactionId: string | null;
  orderStatus: PaymentOrderStatus;
}) {
  return [
    'sale',
    input.provider,
    input.orderId ?? 'no-order',
    input.externalTransactionId ?? 'no-ext-tx',
    input.providerEventId ?? 'no-event',
    input.orderStatus,
  ].join(':');
}

export async function upsertPaymentSettlementTransaction(
  input: PaymentSettlementTransactionInput
): Promise<PaymentSettlementTransactionPersistResult> {
  if (!isSettlementPaymentOrderStatus(input.orderStatus)) {
    return { transaction: null, outcome: 'skipped' };
  }

  const provider = normalizeText(input.provider, 30);
  if (!provider) {
    return { transaction: null, outcome: 'skipped' };
  }

  const orderId = normalizePositiveInt(input.orderId);
  const externalTransactionId = normalizeText(input.externalTransactionId, 255);
  const providerEventId = normalizeText(input.providerEventId, 255);
  const externalInvoiceId = normalizeText(input.externalInvoiceId, 255);
  const providedDedupeKey = normalizeText(input.dedupeKey, 255);
  const dedupeKey =
    providedDedupeKey ||
    buildFallbackDedupeKey({
      provider,
      orderId,
      providerEventId,
      externalTransactionId,
      orderStatus: input.orderStatus,
    }).slice(0, 255);
  const status = mapOrderStatusToTransactionStatus(input.orderStatus);
  const now = new Date();
  const occurredAt = input.occurredAt ?? now;

  const values = {
    orderId,
    provider,
    transactionType: 'sale' as const,
    status,
    amount: normalizeAmount(input.amount),
    currency: normalizeText(input.currency, 10)?.toUpperCase() || null,
    externalTransactionId,
    providerEventId,
    dedupeKey,
    externalInvoiceId,
    payload: normalizeMetadata(input.payload),
    metadata: normalizeMetadata(input.metadata),
    occurredAt,
    updatedAt: now,
  };

  let existing: PaymentSettlementTransactionRecord | null = null;

  if (externalTransactionId) {
    const [row] = await db
      .select(paymentSettlementTransactionSelectFields)
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.provider, provider),
          eq(paymentTransactions.externalTransactionId, externalTransactionId)
        )
      )
      .limit(1);
    existing = row ?? null;
  } else if (providerEventId) {
    const [row] = await db
      .select(paymentSettlementTransactionSelectFields)
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.provider, provider),
          eq(paymentTransactions.providerEventId, providerEventId)
        )
      )
      .limit(1);
    existing = row ?? null;
  } else if (dedupeKey) {
    const [row] = await db
      .select(paymentSettlementTransactionSelectFields)
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.provider, provider),
          eq(paymentTransactions.dedupeKey, dedupeKey)
        )
      )
      .limit(1);
    existing = row ?? null;
  }

  if (!existing) {
    const [inserted] = await db
      .insert(paymentTransactions)
      .values(values)
      .returning(paymentSettlementTransactionSelectFields);

    return {
      transaction: inserted ?? null,
      outcome: inserted ? 'inserted' : 'failed'
    };
  }

  const hasChanges =
    existing.orderId !== values.orderId ||
    existing.status !== values.status ||
    existing.amount !== values.amount ||
    existing.currency !== values.currency ||
    (existing.externalTransactionId ?? null) !== values.externalTransactionId ||
    (existing.providerEventId ?? null) !== values.providerEventId ||
    (existing.dedupeKey ?? null) !== values.dedupeKey ||
    (existing.externalInvoiceId ?? null) !== values.externalInvoiceId ||
    (existing.payload ?? null) !== values.payload ||
    (existing.metadata ?? null) !== values.metadata ||
    existing.occurredAt.getTime() !== values.occurredAt.getTime();

  if (!hasChanges) {
    return {
      transaction: existing,
      outcome: 'unchanged'
    };
  }

  const [updated] = await db
    .update(paymentTransactions)
    .set(values)
    .where(eq(paymentTransactions.id, existing.id))
    .returning(paymentSettlementTransactionSelectFields);

  return {
    transaction: updated ?? existing,
    outcome: updated ? 'updated' : 'unchanged'
  };
}

export async function getPaymentSettlementTransactionByProviderEventId({
  provider,
  providerEventId,
}: {
  provider: string;
  providerEventId: string;
}): Promise<PaymentSettlementTransactionRecord | null> {
  const safeProvider = normalizeText(provider, 30);
  const safeProviderEventId = normalizeText(providerEventId, 255);

  if (!safeProvider || !safeProviderEventId) {
    return null;
  }

  const [row] = await db
    .select(paymentSettlementTransactionSelectFields)
    .from(paymentTransactions)
    .where(
      and(
        eq(paymentTransactions.provider, safeProvider),
        eq(paymentTransactions.providerEventId, safeProviderEventId)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function applyPaymentTransactionReplayPayload(
  payload: PaymentTransactionReplayPayload
) {
  if (payload.operation !== 'upsert_sale') {
    return null;
  }

  return upsertPaymentSettlementTransaction(payload.input);
}

export async function persistPaymentSettlementTransaction(
  input: PaymentSettlementTransactionInput
): Promise<PaymentSettlementTransactionPersistResult> {
  if (!isSettlementPaymentOrderStatus(input.orderStatus)) {
    return { transaction: null, outcome: 'skipped' };
  }

  const provider = normalizeText(input.provider, 30);
  if (!provider) {
    return { transaction: null, outcome: 'skipped' };
  }

  try {
    const result = await upsertPaymentSettlementTransaction(input);
    if (result.transaction && result.outcome !== 'unchanged') {
      await emitEventAsync(
        EVENT_HOOKS.paymentTransactionRecorded,
        {
          transactionId: result.transaction.id,
          orderId: result.transaction.orderId,
          provider: result.transaction.provider,
          status: result.transaction.status,
          amount: result.transaction.amount,
          currency: result.transaction.currency
        },
        { source: '/lib/payments/transactions' }
      );
    }
    return result;
  } catch (error) {
    const reason = formatErrorReason(error);
    console.warn('[payments.transactions] settlement transaction failed', {
      provider,
      orderStatus: input.orderStatus,
      orderId: normalizePositiveInt(input.orderId),
      reason,
    });
    return { transaction: null, outcome: 'failed' };
  }
}
