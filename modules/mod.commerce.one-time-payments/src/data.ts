import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull } from '@skitsaas/sdk/db';
import { getDb } from '@skitsaas/sdk/server';
import { createOneTimeCheckoutOrderStart } from '@/lib/payments/checkout-orders';
import {
  modCommerceProductPrices,
  modCommerceProductPublication,
  modCommerceProducts
} from '../../mod.commerce.products/db/schema';
import {
  modCommerceOnetimeFulfillments,
  modCommerceOnetimeIntents,
  teamMembers,
  teams
} from '../db/schema';
import { COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID } from './constants';
import { resolveOneTimeFulfillmentStatusTransition } from './fulfillment-state';
import type {
  CreateOneTimeCheckoutIntentInput,
  OneTimeCheckoutProvider,
  OneTimeFulfillment,
  OneTimeFulfillmentMutationResult,
  OneTimeFulfillmentStatus,
  OneTimeIntent,
  OneTimeIntentErrorCode,
  OneTimeIntentLookupResult,
  OneTimeIntentMutationResult,
  OneTimeIntentStatus
} from './types';

type OneTimeCheckoutActor = {
  userId: number;
};

type IntentRow = {
  id: number;
  intentKey: string;
  productId: number;
  provider: string;
  status: string;
  targetType: string;
  targetUserId: number | null;
  targetTeamId: number | null;
  amount: number;
  currency: string;
  sessionId: string | null;
  providerIntentId: string | null;
  checkoutUrl: string | null;
  idempotencyKey: string | null;
  productSnapshot: string;
  metadata: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProductRow = {
  id: number;
  productKey: string;
  name: string;
  description: string | null;
  kind: string;
  metadata: string | null;
  publicationIsPublished: boolean | null;
};

type PriceRow = {
  id: number;
  productId: number;
  currency: string;
  unitAmountCents: number;
  provider: string | null;
  providerPriceId: string | null;
  metadata: string | null;
};

export type OneTimeCatalogProduct = {
  productId: number;
  productKey: string;
  name: string;
  description: string | null;
  currency: string;
  unitAmountCents: number;
  provider: string | null;
  providerPriceId: string | null;
  productMetadata: Record<string, unknown> | null;
  priceMetadata: Record<string, unknown> | null;
};

type ResolvedCheckoutLineItem = {
  lineOrder: number;
  productId: number;
  productKey: string;
  name: string;
  description: string | null;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
  currency: string;
  priceId: number;
  priceProvider: string | null;
  providerPriceId: string | null;
  productMetadata: Record<string, unknown> | null;
  priceMetadata: Record<string, unknown> | null;
};

type ResolvedCheckoutIntentLineItemsResult =
  | {
      ok: true;
      lineItems: ResolvedCheckoutLineItem[];
      amount: number;
      currency: string;
    }
  | {
      ok: false;
      code: OneTimeIntentErrorCode;
      message: string;
    };

type FulfillmentRow = {
  id: number;
  intentId: number;
  orderId: number | null;
  status: string;
  providerEventId: string | null;
  externalPaymentId: string | null;
  amount: number | null;
  currency: string | null;
  payload: string | null;
  metadata: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function getOneTimePaymentsDb() {
  return getDb<any>();
}

function normalizePositiveInt(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function parseJsonObject(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function serializeJsonObject(value: Record<string, unknown> | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.stringify(value).slice(0, 12000);
  } catch {
    return null;
  }
}

function normalizeOptionalPositiveIntFromUnknown(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  return null;
}

function normalizeOptionalNonNegativeIntFromUnknown(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  return null;
}

function normalizeRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function mapIntentStatus(status: string): OneTimeIntent['status'] {
  if (
    status === 'pending' ||
    status === 'session_created' ||
    status === 'paid' ||
    status === 'failed' ||
    status === 'canceled' ||
    status === 'refunded'
  ) {
    return status;
  }

  return 'pending';
}

function mapProvider(value: string): OneTimeIntent['provider'] {
  if (value === 'stripe' || value === 'paypal') {
    return value;
  }

  return null;
}

function mapTargetType(value: string): OneTimeIntent['targetType'] {
  return value === 'team' ? 'team' : 'user';
}

function mapFulfillmentStatus(value: string): OneTimeFulfillmentStatus {
  if (
    value === 'pending' ||
    value === 'paid' ||
    value === 'failed' ||
    value === 'canceled' ||
    value === 'refunded'
  ) {
    return value;
  }

  return 'pending';
}

function mapIntentStatusToFulfillmentStatus(
  status: OneTimeIntentStatus
): OneTimeFulfillmentStatus {
  if (
    status === 'paid' ||
    status === 'failed' ||
    status === 'canceled' ||
    status === 'refunded'
  ) {
    return status;
  }

  return 'pending';
}

function mapIntentRow(row: IntentRow): OneTimeIntent {
  return {
    id: row.id,
    intentKey: row.intentKey,
    productId: row.productId,
    provider: mapProvider(row.provider),
    status: mapIntentStatus(row.status),
    targetType: mapTargetType(row.targetType),
    targetUserId: row.targetUserId,
    targetTeamId: row.targetTeamId,
    amount: row.amount,
    currency: row.currency,
    sessionId: row.sessionId,
    providerIntentId: row.providerIntentId,
    checkoutUrl: row.checkoutUrl,
    idempotencyKey: row.idempotencyKey,
    productSnapshot: parseJsonObject(row.productSnapshot) ?? {},
    metadata: parseJsonObject(row.metadata),
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapFulfillmentRow(row: FulfillmentRow): OneTimeFulfillment {
  return {
    id: row.id,
    intentId: row.intentId,
    orderId: row.orderId,
    status: mapFulfillmentStatus(row.status),
    providerEventId: row.providerEventId,
    externalPaymentId: row.externalPaymentId,
    amount: row.amount,
    currency: row.currency?.trim().toUpperCase() || null,
    payload: parseJsonObject(row.payload),
    metadata: parseJsonObject(row.metadata),
    processedAt: row.processedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mutationError(
  code: OneTimeIntentErrorCode,
  message: string
): {
  ok: false;
  code: OneTimeIntentErrorCode;
  message: string;
} {
  return {
    ok: false,
    code,
    message
  };
}

function lookupError(
  code: Exclude<OneTimeIntentLookupResult, { ok: true }>['code'],
  message: string
): {
  ok: false;
  code: Exclude<OneTimeIntentLookupResult, { ok: true }>['code'];
  message: string;
} {
  return {
    ok: false,
    code,
    message
  };
}

function buildIntentKey() {
  return `otp_${randomUUID().replace(/-/g, '')}`;
}

async function userCanAccessTeam(userId: number, teamId: number) {
  const db = getOneTimePaymentsDb();
  const [membership] = await db
    .select({
      teamId: teamMembers.teamId
    })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return Boolean(membership);
}

async function getTeamById(teamId: number) {
  const db = getOneTimePaymentsDb();
  const [team] = await db
    .select({
      id: teams.id
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return team || null;
}

async function getIntentRowById(intentId: number) {
  const db = getOneTimePaymentsDb();
  const [intent] = (await db
    .select({
      id: modCommerceOnetimeIntents.id,
      intentKey: modCommerceOnetimeIntents.intentKey,
      productId: modCommerceOnetimeIntents.productId,
      provider: modCommerceOnetimeIntents.provider,
      status: modCommerceOnetimeIntents.status,
      targetType: modCommerceOnetimeIntents.targetType,
      targetUserId: modCommerceOnetimeIntents.targetUserId,
      targetTeamId: modCommerceOnetimeIntents.targetTeamId,
      amount: modCommerceOnetimeIntents.amount,
      currency: modCommerceOnetimeIntents.currency,
      sessionId: modCommerceOnetimeIntents.sessionId,
      providerIntentId: modCommerceOnetimeIntents.providerIntentId,
      checkoutUrl: modCommerceOnetimeIntents.checkoutUrl,
      idempotencyKey: modCommerceOnetimeIntents.idempotencyKey,
      productSnapshot: modCommerceOnetimeIntents.productSnapshot,
      metadata: modCommerceOnetimeIntents.metadata,
      expiresAt: modCommerceOnetimeIntents.expiresAt,
      createdAt: modCommerceOnetimeIntents.createdAt,
      updatedAt: modCommerceOnetimeIntents.updatedAt
    })
    .from(modCommerceOnetimeIntents)
    .where(eq(modCommerceOnetimeIntents.id, intentId))
    .limit(1)) as IntentRow[] | [];

  return intent || null;
}

async function getIntentRowBySessionId(sessionId: string) {
  const db = getOneTimePaymentsDb();
  const [intent] = (await db
    .select({
      id: modCommerceOnetimeIntents.id,
      intentKey: modCommerceOnetimeIntents.intentKey,
      productId: modCommerceOnetimeIntents.productId,
      provider: modCommerceOnetimeIntents.provider,
      status: modCommerceOnetimeIntents.status,
      targetType: modCommerceOnetimeIntents.targetType,
      targetUserId: modCommerceOnetimeIntents.targetUserId,
      targetTeamId: modCommerceOnetimeIntents.targetTeamId,
      amount: modCommerceOnetimeIntents.amount,
      currency: modCommerceOnetimeIntents.currency,
      sessionId: modCommerceOnetimeIntents.sessionId,
      providerIntentId: modCommerceOnetimeIntents.providerIntentId,
      checkoutUrl: modCommerceOnetimeIntents.checkoutUrl,
      idempotencyKey: modCommerceOnetimeIntents.idempotencyKey,
      productSnapshot: modCommerceOnetimeIntents.productSnapshot,
      metadata: modCommerceOnetimeIntents.metadata,
      expiresAt: modCommerceOnetimeIntents.expiresAt,
      createdAt: modCommerceOnetimeIntents.createdAt,
      updatedAt: modCommerceOnetimeIntents.updatedAt
    })
    .from(modCommerceOnetimeIntents)
    .where(eq(modCommerceOnetimeIntents.sessionId, sessionId))
    .limit(1)) as IntentRow[] | [];

  return intent || null;
}

async function getIntentRowByProviderIntentId({
  provider,
  providerIntentId
}: {
  provider: OneTimeCheckoutProvider;
  providerIntentId: string;
}) {
  const db = getOneTimePaymentsDb();
  const [intent] = (await db
    .select({
      id: modCommerceOnetimeIntents.id,
      intentKey: modCommerceOnetimeIntents.intentKey,
      productId: modCommerceOnetimeIntents.productId,
      provider: modCommerceOnetimeIntents.provider,
      status: modCommerceOnetimeIntents.status,
      targetType: modCommerceOnetimeIntents.targetType,
      targetUserId: modCommerceOnetimeIntents.targetUserId,
      targetTeamId: modCommerceOnetimeIntents.targetTeamId,
      amount: modCommerceOnetimeIntents.amount,
      currency: modCommerceOnetimeIntents.currency,
      sessionId: modCommerceOnetimeIntents.sessionId,
      providerIntentId: modCommerceOnetimeIntents.providerIntentId,
      checkoutUrl: modCommerceOnetimeIntents.checkoutUrl,
      idempotencyKey: modCommerceOnetimeIntents.idempotencyKey,
      productSnapshot: modCommerceOnetimeIntents.productSnapshot,
      metadata: modCommerceOnetimeIntents.metadata,
      expiresAt: modCommerceOnetimeIntents.expiresAt,
      createdAt: modCommerceOnetimeIntents.createdAt,
      updatedAt: modCommerceOnetimeIntents.updatedAt
    })
    .from(modCommerceOnetimeIntents)
    .where(
      and(
        eq(modCommerceOnetimeIntents.provider, provider),
        eq(modCommerceOnetimeIntents.providerIntentId, providerIntentId)
      )
    )
    .limit(1)) as IntentRow[] | [];

  return intent || null;
}

async function getFulfillmentRowByProviderEventId(providerEventId: string) {
  const db = getOneTimePaymentsDb();
  const [fulfillment] = (await db
    .select({
      id: modCommerceOnetimeFulfillments.id,
      intentId: modCommerceOnetimeFulfillments.intentId,
      orderId: modCommerceOnetimeFulfillments.orderId,
      status: modCommerceOnetimeFulfillments.status,
      providerEventId: modCommerceOnetimeFulfillments.providerEventId,
      externalPaymentId: modCommerceOnetimeFulfillments.externalPaymentId,
      amount: modCommerceOnetimeFulfillments.amount,
      currency: modCommerceOnetimeFulfillments.currency,
      payload: modCommerceOnetimeFulfillments.payload,
      metadata: modCommerceOnetimeFulfillments.metadata,
      processedAt: modCommerceOnetimeFulfillments.processedAt,
      createdAt: modCommerceOnetimeFulfillments.createdAt,
      updatedAt: modCommerceOnetimeFulfillments.updatedAt
    })
    .from(modCommerceOnetimeFulfillments)
    .where(eq(modCommerceOnetimeFulfillments.providerEventId, providerEventId))
    .limit(1)) as FulfillmentRow[] | [];

  return fulfillment || null;
}

async function getFulfillmentRowByIntentId(intentId: number) {
  const db = getOneTimePaymentsDb();
  const [fulfillment] = (await db
    .select({
      id: modCommerceOnetimeFulfillments.id,
      intentId: modCommerceOnetimeFulfillments.intentId,
      orderId: modCommerceOnetimeFulfillments.orderId,
      status: modCommerceOnetimeFulfillments.status,
      providerEventId: modCommerceOnetimeFulfillments.providerEventId,
      externalPaymentId: modCommerceOnetimeFulfillments.externalPaymentId,
      amount: modCommerceOnetimeFulfillments.amount,
      currency: modCommerceOnetimeFulfillments.currency,
      payload: modCommerceOnetimeFulfillments.payload,
      metadata: modCommerceOnetimeFulfillments.metadata,
      processedAt: modCommerceOnetimeFulfillments.processedAt,
      createdAt: modCommerceOnetimeFulfillments.createdAt,
      updatedAt: modCommerceOnetimeFulfillments.updatedAt
    })
    .from(modCommerceOnetimeFulfillments)
    .where(eq(modCommerceOnetimeFulfillments.intentId, intentId))
    .limit(1)) as FulfillmentRow[] | [];

  return fulfillment || null;
}

async function getIntentRowByIdempotencyKey(idempotencyKey: string) {
  const db = getOneTimePaymentsDb();
  const [intent] = (await db
    .select({
      id: modCommerceOnetimeIntents.id,
      intentKey: modCommerceOnetimeIntents.intentKey,
      productId: modCommerceOnetimeIntents.productId,
      provider: modCommerceOnetimeIntents.provider,
      status: modCommerceOnetimeIntents.status,
      targetType: modCommerceOnetimeIntents.targetType,
      targetUserId: modCommerceOnetimeIntents.targetUserId,
      targetTeamId: modCommerceOnetimeIntents.targetTeamId,
      amount: modCommerceOnetimeIntents.amount,
      currency: modCommerceOnetimeIntents.currency,
      sessionId: modCommerceOnetimeIntents.sessionId,
      providerIntentId: modCommerceOnetimeIntents.providerIntentId,
      checkoutUrl: modCommerceOnetimeIntents.checkoutUrl,
      idempotencyKey: modCommerceOnetimeIntents.idempotencyKey,
      productSnapshot: modCommerceOnetimeIntents.productSnapshot,
      metadata: modCommerceOnetimeIntents.metadata,
      expiresAt: modCommerceOnetimeIntents.expiresAt,
      createdAt: modCommerceOnetimeIntents.createdAt,
      updatedAt: modCommerceOnetimeIntents.updatedAt
    })
    .from(modCommerceOnetimeIntents)
    .where(eq(modCommerceOnetimeIntents.idempotencyKey, idempotencyKey))
    .limit(1)) as IntentRow[] | [];

  return intent || null;
}

async function getLatestActivePriceForProduct(productId: number) {
  const db = getOneTimePaymentsDb();
  const [price] = (await db
    .select({
      id: modCommerceProductPrices.id,
      productId: modCommerceProductPrices.productId,
      currency: modCommerceProductPrices.currency,
      unitAmountCents: modCommerceProductPrices.unitAmountCents,
      provider: modCommerceProductPrices.provider,
      providerPriceId: modCommerceProductPrices.providerPriceId,
      metadata: modCommerceProductPrices.metadata
    })
    .from(modCommerceProductPrices)
    .where(
      and(
        eq(modCommerceProductPrices.productId, productId),
        eq(modCommerceProductPrices.isActive, true),
        isNull(modCommerceProductPrices.effectiveTo)
      )
    )
    .orderBy(
      desc(modCommerceProductPrices.effectiveFrom),
      desc(modCommerceProductPrices.updatedAt),
      desc(modCommerceProductPrices.id)
    )
    .limit(1)) as PriceRow[] | [];

  return price ?? null;
}

function mapCatalogProduct(
  product: ProductRow,
  price: PriceRow
): OneTimeCatalogProduct {
  return {
    productId: product.id,
    productKey: product.productKey,
    name: product.name,
    description: product.description,
    currency: price.currency.trim().toUpperCase(),
    unitAmountCents: price.unitAmountCents,
    provider: price.provider?.trim().toLowerCase() ?? null,
    providerPriceId: price.providerPriceId,
    productMetadata: parseJsonObject(product.metadata),
    priceMetadata: parseJsonObject(price.metadata)
  };
}

async function getProductForCheckout(productId: number) {
  const db = getOneTimePaymentsDb();
  const [product] = (await db
    .select({
      id: modCommerceProducts.id,
      productKey: modCommerceProducts.productKey,
      name: modCommerceProducts.name,
      description: modCommerceProducts.description,
      kind: modCommerceProducts.kind,
      metadata: modCommerceProducts.metadata,
      publicationIsPublished: modCommerceProductPublication.isPublished
    })
    .from(modCommerceProducts)
    .leftJoin(
      modCommerceProductPublication,
      eq(modCommerceProductPublication.productId, modCommerceProducts.id)
    )
    .where(eq(modCommerceProducts.id, productId))
    .limit(1)) as ProductRow[] | [];

  if (!product) {
    return mutationError('product_not_found', 'Product not found.');
  }

  if (product.kind !== 'one_time') {
    return mutationError(
      'one_time_only_product_required',
      'Product must be one_time.'
    );
  }

  if (!product.publicationIsPublished) {
    return mutationError(
      'product_not_published',
      'Product must be published before checkout.'
    );
  }

  const price = await getLatestActivePriceForProduct(product.id);

  if (!price) {
    return mutationError(
      'product_missing_active_price',
      'Product does not have an active price.'
    );
  }

  return {
    ok: true as const,
    product,
    price
  };
}

async function resolveCheckoutIntentLineItems(
  input: CreateOneTimeCheckoutIntentInput
): Promise<ResolvedCheckoutIntentLineItemsResult> {
  const requestedLineItems =
    Array.isArray(input.lineItems) && input.lineItems.length > 0
      ? input.lineItems
      : input.productId && input.quantity
        ? [
            {
              productId: input.productId,
              quantity: input.quantity
            }
          ]
        : [];

  if (requestedLineItems.length === 0) {
    return mutationError('operation_failed', 'No line items were provided.');
  }

  const resolvedLineItems: ResolvedCheckoutLineItem[] = [];
  let totalAmount = 0;
  let checkoutCurrency: string | null = null;

  for (let index = 0; index < requestedLineItems.length; index += 1) {
    const requestedItem = requestedLineItems[index];
    const productResolution = await getProductForCheckout(requestedItem.productId);
    if (!productResolution.ok) {
      return productResolution;
    }

    const lineCurrency = productResolution.price.currency.trim().toUpperCase();
    if (!checkoutCurrency) {
      checkoutCurrency = lineCurrency;
    } else if (checkoutCurrency !== lineCurrency) {
      return mutationError(
        'invalid_amount',
        'All one-time line items must use the same currency.'
      );
    }

    const lineAmount = productResolution.price.unitAmountCents * requestedItem.quantity;
    if (!Number.isInteger(lineAmount) || lineAmount < 0 || lineAmount > 2_147_483_647) {
      return mutationError('invalid_amount', 'Invalid computed amount.');
    }

    totalAmount += lineAmount;
    if (!Number.isSafeInteger(totalAmount) || totalAmount > 2_147_483_647) {
      return mutationError('invalid_amount', 'Invalid computed amount.');
    }

    resolvedLineItems.push({
      lineOrder: index,
      productId: productResolution.product.id,
      productKey: productResolution.product.productKey,
      name: productResolution.product.name,
      description: productResolution.product.description,
      quantity: requestedItem.quantity,
      unitAmountCents: productResolution.price.unitAmountCents,
      totalAmountCents: lineAmount,
      currency: lineCurrency,
      priceId: productResolution.price.id,
      priceProvider: productResolution.price.provider?.trim().toLowerCase() ?? null,
      providerPriceId: productResolution.price.providerPriceId,
      productMetadata: parseJsonObject(productResolution.product.metadata),
      priceMetadata: parseJsonObject(productResolution.price.metadata)
    });
  }

  if (!checkoutCurrency) {
    return mutationError('operation_failed', 'Unable to resolve checkout currency.');
  }

  return {
    ok: true,
    lineItems: resolvedLineItems,
    amount: totalAmount,
    currency: checkoutCurrency
  };
}

export async function listPublishedOneTimeCatalogProducts({
  limit = 24
}: {
  limit?: number;
} = {}): Promise<OneTimeCatalogProduct[]> {
  const resolvedLimit = Number.isInteger(limit)
    ? Math.max(1, Math.min(100, limit))
    : 24;
  const db = getOneTimePaymentsDb();

  const products = (await db
    .select({
      id: modCommerceProducts.id,
      productKey: modCommerceProducts.productKey,
      name: modCommerceProducts.name,
      description: modCommerceProducts.description,
      kind: modCommerceProducts.kind,
      metadata: modCommerceProducts.metadata,
      publicationIsPublished: modCommerceProductPublication.isPublished
    })
    .from(modCommerceProducts)
    .innerJoin(
      modCommerceProductPublication,
      eq(modCommerceProductPublication.productId, modCommerceProducts.id)
    )
    .where(
      and(
        eq(modCommerceProducts.kind, 'one_time'),
        eq(modCommerceProductPublication.isPublished, true)
      )
    )
    .orderBy(desc(modCommerceProducts.updatedAt), desc(modCommerceProducts.id))
    .limit(resolvedLimit)) as ProductRow[] | [];

  const items: OneTimeCatalogProduct[] = [];
  for (const product of products) {
    const price = await getLatestActivePriceForProduct(product.id);
    if (!price) {
      continue;
    }

    items.push(mapCatalogProduct(product, price));
  }

  return items;
}

export async function getPublishedOneTimeCatalogProduct(
  productId: number
): Promise<OneTimeCatalogProduct | null> {
  const normalizedProductId = normalizePositiveInt(productId);
  if (!normalizedProductId) {
    return null;
  }

  const resolved = await getProductForCheckout(normalizedProductId);
  if (!resolved.ok) {
    return null;
  }

  return mapCatalogProduct(resolved.product, resolved.price);
}

export async function getPrimaryTeamIdForUser(userId: number) {
  const normalizedUserId = normalizePositiveInt(userId);
  if (!normalizedUserId) {
    return null;
  }

  const db = getOneTimePaymentsDb();
  const [membership] = await db
    .select({
      teamId: teamMembers.teamId
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, normalizedUserId))
    .limit(1);

  return normalizePositiveInt(membership?.teamId ?? null);
}

async function ensureTargetPermissions(
  input: CreateOneTimeCheckoutIntentInput,
  actor: OneTimeCheckoutActor
) {
  if (input.targetType === 'user') {
    return {
      ok: true as const,
      targetUserId: actor.userId,
      targetTeamId: null
    };
  }

  const teamId = normalizePositiveInt(input.targetTeamId);
  if (!teamId) {
    return mutationError(
      'target_team_required',
      'targetTeamId is required when targetType is team.'
    );
  }

  const team = await getTeamById(teamId);
  if (!team) {
    return mutationError('target_team_not_found', 'Target team not found.');
  }

  const allowed = await userCanAccessTeam(actor.userId, teamId);
  if (!allowed) {
    return mutationError(
      'target_team_forbidden',
      'User is not a member of the target team.'
    );
  }

  return {
    ok: true as const,
    targetUserId: null,
    targetTeamId: teamId
  };
}

function resolveCoreCheckoutPlanName(intent: IntentRow) {
  const snapshot = parseJsonObject(intent.productSnapshot);
  const snapshotItems = snapshot && Array.isArray(snapshot.items) ? snapshot.items : null;
  if (snapshotItems && snapshotItems.length > 1) {
    return 'One-time order';
  }

  const snapshotName =
    snapshot && typeof snapshot.name === 'string' ? snapshot.name.trim() : '';
  if (snapshotName) {
    return snapshotName;
  }

  return `Product ${intent.productId}`;
}

async function ensureCoreCheckoutForIntent(intent: IntentRow) {
  const targetType = mapTargetType(intent.targetType);
  const normalizedIntentCurrency = intent.currency.trim().toUpperCase();
  const snapshot = parseJsonObject(intent.productSnapshot) ?? {};
  const intentMetadata = parseJsonObject(intent.metadata) ?? {};
  const checkoutMetadataSource = normalizeRecord(intentMetadata.checkout) ?? {};
  const snapshotItems = Array.isArray(snapshot.items) ? snapshot.items : [];
  const normalizedSnapshotLineItems = snapshotItems
    .map((item, index) => {
      const normalizedItem = normalizeRecord(item);
      if (!normalizedItem) {
        return null;
      }

      const quantity = normalizeOptionalPositiveIntFromUnknown(normalizedItem.quantity);
      const unitAmount = normalizeOptionalNonNegativeIntFromUnknown(
        normalizedItem.unitAmountCents
      );
      const totalAmount = normalizeOptionalNonNegativeIntFromUnknown(
        normalizedItem.totalAmountCents
      );
      const currency =
        typeof normalizedItem.currency === 'string'
          ? normalizedItem.currency.trim().toUpperCase()
          : normalizedIntentCurrency;
      const name =
        typeof normalizedItem.name === 'string' && normalizedItem.name.trim()
          ? normalizedItem.name.trim()
          : null;

      if (!quantity || unitAmount === null || totalAmount === null || !name) {
        return null;
      }

      if (quantity * unitAmount !== totalAmount || currency !== normalizedIntentCurrency) {
        return null;
      }

      return {
        lineOrder: index,
        itemType: 'one_time_product' as const,
        productId:
          normalizeOptionalPositiveIntFromUnknown(normalizedItem.productId) ??
          intent.productId,
        productKey:
          typeof normalizedItem.productKey === 'string'
            ? normalizedItem.productKey
            : null,
        name,
        description:
          typeof normalizedItem.description === 'string' &&
          normalizedItem.description.trim()
            ? normalizedItem.description.trim()
            : null,
        quantity,
        unitAmount,
        totalAmount,
        currency,
        metadata: normalizedItem
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  let checkoutLineItems:
    | Array<{
        lineOrder: number;
        itemType: 'one_time_product';
        productId: number;
        productKey: string | null;
        name: string;
        description: string | null;
        quantity: number;
        unitAmount: number;
        totalAmount: number;
        currency: string;
        metadata: Record<string, unknown> | null;
      }>
    | null = null;

  const normalizedSnapshotAmount = normalizedSnapshotLineItems.reduce(
    (sum, item) => sum + item.totalAmount,
    0
  );
  if (
    normalizedSnapshotLineItems.length > 0 &&
    normalizedSnapshotAmount === intent.amount
  ) {
    checkoutLineItems = normalizedSnapshotLineItems;
  } else {
    const snapshotQuantity = normalizeOptionalPositiveIntFromUnknown(snapshot.quantity);
    const snapshotUnitAmount = normalizeOptionalNonNegativeIntFromUnknown(
      snapshot.unitAmountCents
    );
    const fallbackQuantity = snapshotQuantity ?? 1;
    const isSnapshotAmountConsistent =
      snapshotUnitAmount !== null &&
      fallbackQuantity * snapshotUnitAmount === intent.amount;
    const lineItemQuantity = isSnapshotAmountConsistent ? fallbackQuantity : 1;
    const lineItemUnitAmount = isSnapshotAmountConsistent
      ? snapshotUnitAmount
      : intent.amount;
    const lineItemName =
      typeof snapshot.name === 'string' && snapshot.name.trim()
        ? snapshot.name.trim()
        : resolveCoreCheckoutPlanName(intent);
    const lineItemDescription =
      typeof snapshot.description === 'string' && snapshot.description.trim()
        ? snapshot.description.trim()
        : null;
    const lineItemProductKey =
      typeof snapshot.productKey === 'string' ? snapshot.productKey : null;

    checkoutLineItems = [
      {
        lineOrder: 0,
        itemType: 'one_time_product',
        productId: intent.productId,
        productKey: lineItemProductKey,
        name: lineItemName,
        description: lineItemDescription,
        quantity: lineItemQuantity,
        unitAmount: lineItemUnitAmount,
        totalAmount: intent.amount,
        currency: normalizedIntentCurrency,
        metadata: snapshot
      }
    ];
  }

  const primaryLineItem = checkoutLineItems[0];

  const checkoutStart = await createOneTimeCheckoutOrderStart({
    moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
    source: 'module',
    teamId: targetType === 'team' ? intent.targetTeamId : null,
    targetType,
    targetTeamId: targetType === 'team' ? intent.targetTeamId : null,
    targetUserId: targetType === 'user' ? intent.targetUserId : null,
    amount: intent.amount,
    currency: normalizedIntentCurrency,
    lineItems: checkoutLineItems,
    planName: resolveCoreCheckoutPlanName(intent),
    paymentMethodId: null,
    idempotencyKey: `otp_core_checkout_intent:${intent.id}`,
    metadata: {
      intentId: intent.id,
      intentKey: intent.intentKey,
      productId: primaryLineItem?.productId ?? intent.productId,
      productKey: primaryLineItem?.productKey ?? null,
      quantity: primaryLineItem?.quantity ?? null,
      itemsCount: checkoutLineItems.length,
      snapshot
    }
  });
  if (!checkoutStart) {
    return null;
  }

  const mergedMetadata = {
    ...intentMetadata,
    checkout: {
      ...checkoutMetadataSource,
      mode: 'core_checkout',
      checkoutToken: checkoutStart.checkoutOrder.checkoutToken,
      checkoutOrderId: checkoutStart.checkoutOrder.id,
      checkoutPath: checkoutStart.checkoutPath,
      checkoutUrl: checkoutStart.checkoutUrl
    }
  } satisfies Record<string, unknown>;

  const db = getOneTimePaymentsDb();
  const serializedMetadata = serializeJsonObject(mergedMetadata);
  const now = new Date();

  try {
    await db
      .update(modCommerceOnetimeIntents)
      .set({
        checkoutUrl: checkoutStart.checkoutUrl,
        metadata: serializedMetadata ?? intent.metadata,
        updatedAt: now
      })
      .where(eq(modCommerceOnetimeIntents.id, intent.id));
  } catch (error) {
    console.error(
      '[mod.commerce.one-time-payments] ensureCoreCheckoutForIntent failed',
      error
    );
    return null;
  }

  return getIntentRowById(intent.id);
}

export async function createOneTimeCheckoutIntent(
  input: CreateOneTimeCheckoutIntentInput,
  actor: OneTimeCheckoutActor
): Promise<OneTimeIntentMutationResult> {
  if (!normalizePositiveInt(actor.userId)) {
    return mutationError('operation_failed', 'Invalid checkout actor.');
  }

  if (input.idempotencyKey) {
    const existing = await getIntentRowByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      const existingTargetType = mapTargetType(existing.targetType);
      if (
        (existingTargetType === 'user' &&
          existing.targetUserId === actor.userId) ||
        (existingTargetType === 'team' &&
          existing.targetTeamId &&
          (await userCanAccessTeam(actor.userId, existing.targetTeamId)))
      ) {
        const ensuredCoreCheckoutIntent = await ensureCoreCheckoutForIntent(existing);
        if (!ensuredCoreCheckoutIntent) {
          return mutationError(
            'operation_failed',
            'Unable to initialize core checkout order.'
          );
        }

        return {
          ok: true,
          intent: mapIntentRow(ensuredCoreCheckoutIntent),
          idempotencyReused: true
        };
      }

      return mutationError(
        'operation_failed',
        'idempotencyKey already exists for a different target.'
      );
    }
  }

  const target = await ensureTargetPermissions(input, actor);
  if (!target.ok) {
    return target;
  }

  const resolvedLineItems = await resolveCheckoutIntentLineItems(input);
  if (!resolvedLineItems.ok) {
    return resolvedLineItems;
  }

  const primaryLineItem = resolvedLineItems.lineItems[0];
  if (!primaryLineItem) {
    return mutationError('operation_failed', 'Unable to resolve checkout line items.');
  }

  const productSnapshot = {
    schemaVersion: 2,
    productId: primaryLineItem.productId,
    productKey: primaryLineItem.productKey,
    name: primaryLineItem.name,
    description: primaryLineItem.description,
    quantity: primaryLineItem.quantity,
    unitAmountCents: primaryLineItem.unitAmountCents,
    amount: resolvedLineItems.amount,
    currency: resolvedLineItems.currency,
    itemsCount: resolvedLineItems.lineItems.length,
    items: resolvedLineItems.lineItems.map((lineItem) => ({
      productId: lineItem.productId,
      productKey: lineItem.productKey,
      name: lineItem.name,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unitAmountCents: lineItem.unitAmountCents,
      totalAmountCents: lineItem.totalAmountCents,
      currency: lineItem.currency,
      price: {
        id: lineItem.priceId,
        provider: lineItem.priceProvider,
        providerPriceId: lineItem.providerPriceId,
        metadata: lineItem.priceMetadata
      },
      productMetadata: lineItem.productMetadata
    }))
  } satisfies Record<string, unknown>;

  const metadata = {
    ...(input.metadata || {}),
    checkout: {
      mode: 'core_checkout',
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl
    }
  } satisfies Record<string, unknown>;

  const db = getOneTimePaymentsDb();
  const now = new Date();
  let createdIntentId: number | null = null;

  try {
    const [created] = await db
      .insert(modCommerceOnetimeIntents)
      .values({
        intentKey: buildIntentKey(),
        productId: primaryLineItem.productId,
        provider: 'unbound',
        status: 'pending',
        targetType: input.targetType,
        targetUserId: target.targetUserId,
        targetTeamId: target.targetTeamId,
        amount: resolvedLineItems.amount,
        currency: resolvedLineItems.currency,
        sessionId: null,
        providerIntentId: null,
        checkoutUrl: null,
        idempotencyKey: input.idempotencyKey,
        productSnapshot: JSON.stringify(productSnapshot),
        metadata: serializeJsonObject(metadata),
        expiresAt: null,
        updatedAt: now
      })
      .returning({
        id: modCommerceOnetimeIntents.id
      });

    createdIntentId = created?.id ?? null;
  } catch (error) {
    console.error(
      '[mod.commerce.one-time-payments] createOneTimeCheckoutIntent failed',
      error
    );
    return mutationError('operation_failed', 'Unable to create checkout intent.');
  }

  if (!createdIntentId) {
    return mutationError('operation_failed', 'Unable to create checkout intent.');
  }

  const createdIntent = await getIntentRowById(createdIntentId);
  if (!createdIntent) {
    return mutationError('operation_failed', 'Created intent was not found.');
  }

  const ensuredCoreCheckoutIntent = await ensureCoreCheckoutForIntent(createdIntent);
  if (!ensuredCoreCheckoutIntent) {
    return mutationError(
      'operation_failed',
      'Unable to initialize core checkout order.'
    );
  }

  return {
    ok: true,
    intent: mapIntentRow(ensuredCoreCheckoutIntent),
    idempotencyReused: false
  };
}

export async function getOneTimeIntentByIdForActor(
  intentId: number,
  actor: OneTimeCheckoutActor
): Promise<OneTimeIntentLookupResult> {
  if (!normalizePositiveInt(actor.userId)) {
    return lookupError('forbidden', 'User is not allowed to read this intent.');
  }

  const intent = await getIntentRowById(intentId);
  if (!intent) {
    return lookupError('not_found', 'Intent not found.');
  }

  const targetType = mapTargetType(intent.targetType);
  if (targetType === 'user') {
    if (intent.targetUserId !== actor.userId) {
      return lookupError('forbidden', 'Intent does not belong to current user.');
    }
  } else {
    const teamId = normalizePositiveInt(intent.targetTeamId);
    if (!teamId) {
      return lookupError('forbidden', 'Intent target is not readable.');
    }

    const allowed = await userCanAccessTeam(actor.userId, teamId);
    if (!allowed) {
      return lookupError('forbidden', 'Intent does not belong to current team.');
    }
  }

  const fulfillment = await getFulfillmentRowByIntentId(intent.id);

  return {
    ok: true,
    intent: mapIntentRow(intent),
    fulfillment: fulfillment ? mapFulfillmentRow(fulfillment) : null
  };
}

export async function getOneTimeIntentBySessionId(sessionId: string) {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return null;
  }

  const intent = await getIntentRowBySessionId(normalizedSessionId);
  return intent ? mapIntentRow(intent) : null;
}

export async function getOneTimeIntentByProviderIntentId({
  provider,
  providerIntentId
}: {
  provider: OneTimeCheckoutProvider;
  providerIntentId: string;
}) {
  const normalizedProviderIntentId = providerIntentId.trim();
  if (!normalizedProviderIntentId) {
    return null;
  }

  const intent = await getIntentRowByProviderIntentId({
    provider,
    providerIntentId: normalizedProviderIntentId
  });
  return intent ? mapIntentRow(intent) : null;
}

async function attachProviderSessionToOneTimeIntent({
  intentId,
  provider,
  sessionId,
  checkoutUrl,
  providerIntentId,
  expiresAt
}: {
  intentId: number;
  provider: OneTimeCheckoutProvider;
  sessionId: string;
  checkoutUrl: string | null;
  providerIntentId: string | null;
  expiresAt: Date | null;
}): Promise<OneTimeIntentMutationResult> {
  const normalizedIntentId = normalizePositiveInt(intentId);
  if (!normalizedIntentId) {
    return mutationError('not_found', 'Intent not found.');
  }

  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return mutationError(
      'provider_session_create_failed',
      'Invalid provider session id.'
    );
  }

  const existing = await getIntentRowById(normalizedIntentId);
  if (!existing) {
    return mutationError('not_found', 'Intent not found.');
  }

  const db = getOneTimePaymentsDb();
  const now = new Date();

  try {
    await db
      .update(modCommerceOnetimeIntents)
      .set({
        provider,
        status: 'session_created',
        sessionId: normalizedSessionId,
        checkoutUrl: checkoutUrl?.trim() || null,
        providerIntentId: providerIntentId?.trim() || null,
        expiresAt,
        updatedAt: now
      })
      .where(eq(modCommerceOnetimeIntents.id, existing.id));
  } catch (error) {
    console.error(
      '[mod.commerce.one-time-payments] attachProviderSessionToOneTimeIntent failed',
      error
    );
    return mutationError(
      'operation_failed',
      'Unable to persist provider checkout session.'
    );
  }

  const updated = await getIntentRowById(existing.id);
  if (!updated) {
    return mutationError(
      'operation_failed',
      'Updated intent not found after session attach.'
    );
  }

  return {
    ok: true,
    intent: mapIntentRow(updated),
    idempotencyReused: false
  };
}

export async function attachStripeSessionToOneTimeIntent({
  intentId,
  sessionId,
  checkoutUrl,
  providerIntentId,
  expiresAt
}: {
  intentId: number;
  sessionId: string;
  checkoutUrl: string | null;
  providerIntentId: string | null;
  expiresAt: Date | null;
}): Promise<OneTimeIntentMutationResult> {
  return attachProviderSessionToOneTimeIntent({
    intentId,
    provider: 'stripe',
    sessionId,
    checkoutUrl,
    providerIntentId,
    expiresAt
  });
}

export async function attachPayPalSessionToOneTimeIntent({
  intentId,
  sessionId,
  checkoutUrl,
  providerIntentId,
  expiresAt
}: {
  intentId: number;
  sessionId: string;
  checkoutUrl: string | null;
  providerIntentId: string | null;
  expiresAt: Date | null;
}): Promise<OneTimeIntentMutationResult> {
  return attachProviderSessionToOneTimeIntent({
    intentId,
    provider: 'paypal',
    sessionId,
    checkoutUrl,
    providerIntentId,
    expiresAt
  });
}

export async function registerOneTimeIntentFulfillmentFromWebhook({
  intentId,
  orderId,
  status,
  providerEventId,
  externalPaymentId,
  amount,
  currency,
  payload,
  metadata
}: {
  intentId: number;
  orderId: number | null;
  status: Exclude<OneTimeFulfillmentStatus, 'pending'>;
  providerEventId: string;
  externalPaymentId: string | null;
  amount: number | null;
  currency: string | null;
  payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}): Promise<OneTimeFulfillmentMutationResult> {
  const normalizedIntentId = normalizePositiveInt(intentId);
  if (!normalizedIntentId) {
    return {
      ok: false as const,
      code: 'not_found' as const,
      message: 'Intent not found.'
    };
  }

  const normalizedEventId = providerEventId.trim();
  if (!normalizedEventId) {
    return {
      ok: false as const,
      code: 'operation_failed' as const,
      message: 'Invalid provider event id.'
    };
  }

  const alreadyProcessed = await getFulfillmentRowByProviderEventId(
    normalizedEventId
  );
  if (alreadyProcessed) {
    const intent = await getIntentRowById(alreadyProcessed.intentId);
    return {
      ok: true as const,
      alreadyProcessed: true,
      transitionApplied: false,
      requestedStatus: status,
      intent: intent ? mapIntentRow(intent) : null,
      fulfillment: mapFulfillmentRow(alreadyProcessed),
      status: mapFulfillmentStatus(alreadyProcessed.status)
    };
  }

  const intent = await getIntentRowById(normalizedIntentId);
  if (!intent) {
    return {
      ok: false as const,
      code: 'not_found' as const,
      message: 'Intent not found.'
    };
  }

  const currentIntent = mapIntentRow(intent);
  const existingFulfillment = await getFulfillmentRowByIntentId(intent.id);
  const currentFulfillmentStatus = existingFulfillment
    ? mapFulfillmentStatus(existingFulfillment.status)
    : mapIntentStatusToFulfillmentStatus(currentIntent.status);
  const transition = resolveOneTimeFulfillmentStatusTransition({
    currentStatus: currentFulfillmentStatus,
    requestedStatus: status
  });

  if (existingFulfillment && !transition.transitionApplied) {
    return {
      ok: true,
      alreadyProcessed: false,
      transitionApplied: false,
      requestedStatus: status,
      intent: currentIntent,
      fulfillment: mapFulfillmentRow(existingFulfillment),
      status: currentFulfillmentStatus
    };
  }

  const db = getOneTimePaymentsDb();
  const now = new Date();
  const normalizedExternalPaymentId = externalPaymentId?.trim() || null;
  const normalizedCurrency = currency?.trim().toUpperCase() || null;
  const normalizedOrderId = normalizePositiveInt(orderId);

  try {
    await db.transaction(async (tx: any) => {
      const shouldUpdateIntent =
        currentIntent.status !== transition.nextStatus ||
        (normalizedExternalPaymentId &&
          normalizedExternalPaymentId !== intent.providerIntentId);
      if (shouldUpdateIntent) {
        await tx
          .update(modCommerceOnetimeIntents)
          .set({
            status: transition.nextStatus,
            providerIntentId: normalizedExternalPaymentId || intent.providerIntentId,
            updatedAt: now
          })
          .where(eq(modCommerceOnetimeIntents.id, intent.id));
      }

      if (existingFulfillment) {
        await tx
          .update(modCommerceOnetimeFulfillments)
          .set({
            orderId: normalizedOrderId ?? existingFulfillment.orderId,
            status: transition.nextStatus,
            providerEventId: normalizedEventId,
            externalPaymentId: normalizedExternalPaymentId,
            amount,
            currency: normalizedCurrency,
            payload: serializeJsonObject(payload),
            metadata: serializeJsonObject(metadata),
            processedAt: now,
            updatedAt: now
          })
          .where(eq(modCommerceOnetimeFulfillments.id, existingFulfillment.id));
      } else {
        await tx.insert(modCommerceOnetimeFulfillments).values({
          intentId: intent.id,
          orderId: normalizedOrderId ?? null,
          status: transition.nextStatus,
          providerEventId: normalizedEventId,
          externalPaymentId: normalizedExternalPaymentId,
          amount,
          currency: normalizedCurrency,
          payload: serializeJsonObject(payload),
          metadata: serializeJsonObject(metadata),
          processedAt: now,
          updatedAt: now
        });
      }
    });
  } catch (error) {
    console.error(
      '[mod.commerce.one-time-payments] registerOneTimeIntentFulfillmentFromWebhook failed',
      error
    );
    return {
      ok: false as const,
      code: 'operation_failed' as const,
      message: 'Unable to persist webhook fulfillment result.'
    };
  }

  const updatedIntent = await getIntentRowById(intent.id);
  const updatedFulfillment = await getFulfillmentRowByIntentId(intent.id);
  const resolvedStatus = updatedFulfillment
    ? mapFulfillmentStatus(updatedFulfillment.status)
    : transition.nextStatus;

  return {
    ok: true as const,
    alreadyProcessed: false,
    transitionApplied: transition.transitionApplied,
    requestedStatus: status,
    intent: updatedIntent ? mapIntentRow(updatedIntent) : null,
    fulfillment: updatedFulfillment ? mapFulfillmentRow(updatedFulfillment) : null,
    status: resolvedStatus
  };
}
