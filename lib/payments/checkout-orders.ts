import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { getSubscriptionTemplateById } from '@/lib/db/queries';
import {
  checkoutOrders,
  teamMembers,
  type CheckoutOrder,
  type SubscriptionTemplate
} from '@/lib/db/schema';
import {
  createCheckoutTemplateSnapshot,
  type CheckoutTemplateSnapshot
} from './checkout-system';
import { isSubscriptionTemplateScopeCompatible } from './subscription-scope';
import {
  classifySubscriptionPlanRelation,
  isSubscriptionTemplateTrialEligible,
  resolveSubscriptionTrialUsageTarget,
  type SubscriptionPlanRelation
} from './subscription-policy';

export type CheckoutOrderType = 'subscription' | 'one_time';
export type CheckoutOrderStatus =
  | 'draft'
  | 'ready'
  | 'provider_pending'
  | 'completed'
  | 'canceled'
  | 'failed'
  | 'expired';

export type CheckoutOrderPaymentProvider = string;

const CHECKOUT_ORDER_METADATA_VERSION = 1 as const;
const DEFAULT_CHECKOUT_ORDER_EXPIRES_IN_MS = 1000 * 60 * 60;
const CHECKOUT_ORDER_TOKEN_BYTES = 18;

type CheckoutOrderMetadataBase = {
  schemaVersion: typeof CHECKOUT_ORDER_METADATA_VERSION;
};

export type CheckoutOrderSubscriptionMetadata = {
  templateSnapshot: CheckoutTemplateSnapshot;
  changeMode: 'immediate' | 'period_end' | null;
  currentAssignmentId: number | null;
  currentTemplateId: number | null;
  scheduledStartTime: string | null;
  categoryKey?: string | null;
  hierarchyRank?: number | null;
  planRelation?: SubscriptionPlanRelation | null;
  trialEligible?: boolean | null;
};

export type CheckoutOrderOneTimeMetadata = {
  moduleId: string | null;
  intentId: number | null;
  intentKey: string | null;
  productId: number | null;
  productKey: string | null;
  quantity: number | null;
  paymentMethodId: string | null;
  provider: string | null;
  snapshot: Record<string, unknown> | null;
};

export type CheckoutOrderMetadata = CheckoutOrderMetadataBase & {
  subscription?: CheckoutOrderSubscriptionMetadata;
  oneTime?: CheckoutOrderOneTimeMetadata;
  [key: string]: unknown;
};

export type CheckoutOrderWithMetadata = CheckoutOrder & {
  parsedMetadata: CheckoutOrderMetadata | null;
};

export type CheckoutOrderUserAccess = {
  checkoutOrder: CheckoutOrderWithMetadata;
  teamRole: string | null;
};

export type OneTimeCheckoutOrderStartResult = {
  checkoutOrder: CheckoutOrderWithMetadata;
  checkoutPath: string;
  checkoutUrl: string;
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
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeChangeMode(value: unknown) {
  if (value === 'immediate' || value === 'period_end') {
    return value;
  }

  return null;
}

function normalizeAmount(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value);
}

function toCheckoutOrderWithMetadata(order: CheckoutOrder): CheckoutOrderWithMetadata {
  return {
    ...order,
    parsedMetadata: parseCheckoutOrderMetadata(order.metadata)
  };
}

function buildCheckoutOrderToken() {
  return randomBytes(CHECKOUT_ORDER_TOKEN_BYTES).toString('base64url');
}

function normalizeCheckoutOrigin(value: string | null | undefined) {
  const normalized = normalizeText(value, 2000);
  if (!normalized) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalized);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null;
    }

    return parsedUrl.origin;
  } catch {
    return null;
  }
}

export function buildCheckoutOrderPath(checkoutToken: string) {
  const normalizedToken = normalizeText(checkoutToken, 80);
  if (!normalizedToken) {
    return null;
  }

  return `/checkout/${encodeURIComponent(normalizedToken)}`;
}

export function buildCheckoutOrderUrl({
  checkoutToken,
  origin = null
}: {
  checkoutToken: string;
  origin?: string | null;
}) {
  const checkoutPath = buildCheckoutOrderPath(checkoutToken);
  if (!checkoutPath) {
    return null;
  }

  const resolvedOrigin =
    normalizeCheckoutOrigin(origin) ??
    normalizeCheckoutOrigin(process.env.BASE_URL ?? null);
  if (!resolvedOrigin) {
    return checkoutPath;
  }

  return `${resolvedOrigin}${checkoutPath}`;
}

function serializeCheckoutOrderMetadata(metadata: CheckoutOrderMetadata) {
  try {
    return JSON.stringify(metadata).slice(0, 12000);
  } catch {
    return null;
  }
}

export function parseCheckoutOrderMetadata(
  metadata: string | null | undefined
): CheckoutOrderMetadata | null {
  if (!metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata) as CheckoutOrderMetadata;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function resolveCheckoutOrderExpiration(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}

function normalizeScheduledStartTime(value: string | null | undefined) {
  return normalizeText(value, 120);
}

function normalizeTargetType(value: string | null | undefined) {
  if (value === 'team' || value === 'user') {
    return value;
  }

  return null;
}

function normalizeMetadataRecord(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

export async function expireCheckoutOrderIfNeeded(
  order: CheckoutOrder
): Promise<CheckoutOrderWithMetadata> {
  if (
    order.status !== 'ready' &&
    order.status !== 'provider_pending'
  ) {
    return toCheckoutOrderWithMetadata(order);
  }

  if (!resolveCheckoutOrderExpiration(order.expiresAt)) {
    return toCheckoutOrderWithMetadata(order);
  }

  const [updated] = await db
    .update(checkoutOrders)
    .set({
      status: 'expired',
      updatedAt: new Date()
    })
    .where(
      and(
        eq(checkoutOrders.id, order.id),
        inArray(checkoutOrders.status, ['ready', 'provider_pending'])
      )
    )
    .returning();

  return toCheckoutOrderWithMetadata(updated ?? order);
}

export async function getCheckoutOrderByToken(
  checkoutToken: string
): Promise<CheckoutOrderWithMetadata | null> {
  const normalizedToken = normalizeText(checkoutToken, 80);
  if (!normalizedToken) {
    return null;
  }

  const [row] = await db
    .select()
    .from(checkoutOrders)
    .where(eq(checkoutOrders.checkoutToken, normalizedToken))
    .limit(1);

  if (!row) {
    return null;
  }

  return expireCheckoutOrderIfNeeded(row);
}

export async function getCheckoutOrderByTokenForTeam({
  checkoutToken,
  teamId
}: {
  checkoutToken: string;
  teamId: number;
}): Promise<CheckoutOrderWithMetadata | null> {
  const normalizedToken = normalizeText(checkoutToken, 80);
  const normalizedTeamId = normalizePositiveInt(teamId);

  if (!normalizedToken || !normalizedTeamId) {
    return null;
  }

  const [row] = await db
    .select()
    .from(checkoutOrders)
    .where(
      and(
        eq(checkoutOrders.checkoutToken, normalizedToken),
        or(
          eq(checkoutOrders.teamId, normalizedTeamId),
          eq(checkoutOrders.targetTeamId, normalizedTeamId)
        )
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return expireCheckoutOrderIfNeeded(row);
}

export async function getCheckoutOrderByTokenForUser({
  checkoutToken,
  userId
}: {
  checkoutToken: string;
  userId: number;
}): Promise<CheckoutOrderUserAccess | null> {
  const normalizedToken = normalizeText(checkoutToken, 80);
  const normalizedUserId = normalizePositiveInt(userId);
  if (!normalizedToken || !normalizedUserId) {
    return null;
  }

  const [row] = await db
    .select()
    .from(checkoutOrders)
    .where(eq(checkoutOrders.checkoutToken, normalizedToken))
    .limit(1);

  if (!row) {
    return null;
  }

  const hydrated = await expireCheckoutOrderIfNeeded(row);
  const targetType = normalizeTargetType(hydrated.targetType);

  if (targetType === 'user') {
    if (hydrated.targetUserId !== normalizedUserId) {
      return null;
    }

    return {
      checkoutOrder: hydrated,
      teamRole: null
    };
  }

  const scopedTeamId = normalizePositiveInt(
    hydrated.targetTeamId ?? hydrated.teamId
  );
  if (!scopedTeamId) {
    return null;
  }

  const [membership] = await db
    .select({
      role: teamMembers.role
    })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, scopedTeamId),
        eq(teamMembers.userId, normalizedUserId)
      )
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return {
    checkoutOrder: hydrated,
    teamRole: normalizeText(membership.role, 50)
  };
}

export async function getCheckoutOrderByProviderSession({
  provider,
  providerSessionId
}: {
  provider: string;
  providerSessionId: string;
}) {
  const normalizedProvider = normalizeText(provider, 30);
  const normalizedSessionId = normalizeText(providerSessionId, 255);
  if (!normalizedProvider || !normalizedSessionId) {
    return null;
  }

  const [row] = await db
    .select()
    .from(checkoutOrders)
    .where(
      and(
        eq(checkoutOrders.selectedProvider, normalizedProvider),
        eq(checkoutOrders.providerSessionId, normalizedSessionId)
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return expireCheckoutOrderIfNeeded(row);
}

export function isReusableSubscriptionCheckoutOrderForContext({
  order,
  teamId,
  templateId,
  changeMode,
  scheduledStartTime
}: {
  order: CheckoutOrderWithMetadata;
  teamId: number;
  templateId: number;
  changeMode?: 'immediate' | 'period_end' | null;
  scheduledStartTime?: string | null;
}) {
  const normalizedTeamId = normalizePositiveInt(teamId);
  const normalizedTemplateId = normalizePositiveInt(templateId);
  if (!normalizedTeamId || !normalizedTemplateId) {
    return false;
  }

  if (order.orderType !== 'subscription') {
    return false;
  }

  if (order.subscriptionTemplateId !== normalizedTemplateId) {
    return false;
  }

  if (order.teamId !== normalizedTeamId) {
    return false;
  }

  if (order.targetType !== 'team' || order.targetTeamId !== normalizedTeamId) {
    return false;
  }

  if (!isCheckoutOrderPayable(order)) {
    return false;
  }

  const requestedChangeMode = normalizeChangeMode(changeMode);
  const orderChangeMode = normalizeChangeMode(
    order.parsedMetadata?.subscription?.changeMode
  );
  if ((orderChangeMode ?? null) !== (requestedChangeMode ?? null)) {
    return false;
  }

  const requestedStartTime = normalizeScheduledStartTime(scheduledStartTime);
  const orderStartTime = normalizeScheduledStartTime(
    order.parsedMetadata?.subscription?.scheduledStartTime
  );
  if ((orderStartTime ?? null) !== (requestedStartTime ?? null)) {
    return false;
  }

  return true;
}

function isReusableUserSubscriptionCheckoutOrderForContext({
  order,
  userId,
  templateId,
  changeMode,
  scheduledStartTime
}: {
  order: CheckoutOrderWithMetadata;
  userId: number;
  templateId: number;
  changeMode?: 'immediate' | 'period_end' | null;
  scheduledStartTime?: string | null;
}) {
  const normalizedUserId = normalizePositiveInt(userId);
  const normalizedTemplateId = normalizePositiveInt(templateId);
  if (!normalizedUserId || !normalizedTemplateId) {
    return false;
  }

  if (order.orderType !== 'subscription') {
    return false;
  }

  if (order.subscriptionTemplateId !== normalizedTemplateId) {
    return false;
  }

  if (order.targetType !== 'user' || order.targetUserId !== normalizedUserId) {
    return false;
  }

  if (!isCheckoutOrderPayable(order)) {
    return false;
  }

  const requestedChangeMode = normalizeChangeMode(changeMode);
  const orderChangeMode = normalizeChangeMode(
    order.parsedMetadata?.subscription?.changeMode
  );
  if ((orderChangeMode ?? null) !== (requestedChangeMode ?? null)) {
    return false;
  }

  const requestedStartTime = normalizeScheduledStartTime(scheduledStartTime);
  const orderStartTime = normalizeScheduledStartTime(
    order.parsedMetadata?.subscription?.scheduledStartTime
  );
  if ((orderStartTime ?? null) !== (requestedStartTime ?? null)) {
    return false;
  }

  return true;
}

async function findReusableTeamSubscriptionCheckoutOrder({
  teamId,
  templateId,
  changeMode,
  scheduledStartTime
}: {
  teamId: number;
  templateId: number;
  changeMode?: 'immediate' | 'period_end' | null;
  scheduledStartTime?: string | null;
}) {
  const normalizedTeamId = normalizePositiveInt(teamId);
  const normalizedTemplateId = normalizePositiveInt(templateId);
  if (!normalizedTeamId || !normalizedTemplateId) {
    return null;
  }

  const rows = await db
    .select()
    .from(checkoutOrders)
    .where(
      and(
        eq(checkoutOrders.orderType, 'subscription'),
        eq(checkoutOrders.teamId, normalizedTeamId),
        eq(checkoutOrders.targetType, 'team'),
        eq(checkoutOrders.targetTeamId, normalizedTeamId),
        eq(checkoutOrders.subscriptionTemplateId, normalizedTemplateId),
        inArray(checkoutOrders.status, ['ready', 'provider_pending'])
      )
    )
    .orderBy(desc(checkoutOrders.updatedAt))
    .limit(5);

  for (const row of rows) {
    const hydrated = await expireCheckoutOrderIfNeeded(row);
    if (
      !isReusableSubscriptionCheckoutOrderForContext({
        order: hydrated,
        teamId: normalizedTeamId,
        templateId: normalizedTemplateId,
        changeMode,
        scheduledStartTime
      })
    ) {
      continue;
    }

    return hydrated;
  }

  return null;
}

async function findReusableUserSubscriptionCheckoutOrder({
  userId,
  templateId,
  changeMode,
  scheduledStartTime
}: {
  userId: number;
  templateId: number;
  changeMode?: 'immediate' | 'period_end' | null;
  scheduledStartTime?: string | null;
}) {
  const normalizedUserId = normalizePositiveInt(userId);
  const normalizedTemplateId = normalizePositiveInt(templateId);
  if (!normalizedUserId || !normalizedTemplateId) {
    return null;
  }

  const rows = await db
    .select()
    .from(checkoutOrders)
    .where(
      and(
        eq(checkoutOrders.orderType, 'subscription'),
        eq(checkoutOrders.targetType, 'user'),
        eq(checkoutOrders.targetUserId, normalizedUserId),
        eq(checkoutOrders.subscriptionTemplateId, normalizedTemplateId),
        inArray(checkoutOrders.status, ['ready', 'provider_pending'])
      )
    )
    .orderBy(desc(checkoutOrders.updatedAt))
    .limit(5);

  for (const row of rows) {
    const hydrated = await expireCheckoutOrderIfNeeded(row);
    if (
      !isReusableUserSubscriptionCheckoutOrderForContext({
        order: hydrated,
        userId: normalizedUserId,
        templateId: normalizedTemplateId,
        changeMode,
        scheduledStartTime
      })
    ) {
      continue;
    }

    return hydrated;
  }

  return null;
}

async function getCheckoutOrderByIdempotencyKey(idempotencyKey: string) {
  const normalizedIdempotencyKey = normalizeText(idempotencyKey, 120);
  if (!normalizedIdempotencyKey) {
    return null;
  }

  const [row] = await db
    .select()
    .from(checkoutOrders)
    .where(eq(checkoutOrders.idempotencyKey, normalizedIdempotencyKey))
    .limit(1);

  if (!row) {
    return null;
  }

  return expireCheckoutOrderIfNeeded(row);
}

export async function createSubscriptionCheckoutOrder({
  teamId,
  userId,
  template,
  changeMode,
  currentAssignmentId,
  currentTemplateId,
  scheduledStartTime,
  source = 'pricing',
  expiresInMs = DEFAULT_CHECKOUT_ORDER_EXPIRES_IN_MS
}: {
  teamId: number;
  userId: number;
  template: SubscriptionTemplate;
  changeMode?: 'immediate' | 'period_end' | null;
  currentAssignmentId?: number | null;
  currentTemplateId?: number | null;
  scheduledStartTime?: string | null;
  source?: string;
  expiresInMs?: number;
}): Promise<CheckoutOrderWithMetadata | null> {
  const normalizedTeamId = normalizePositiveInt(teamId);
  const normalizedUserId = normalizePositiveInt(userId);
  if (!normalizedTeamId || !normalizedUserId) {
    return null;
  }

  if (
    !isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: 'team',
      templateTargetScope: template.targetScope
    })
  ) {
    return null;
  }

  const normalizedChangeMode = normalizeChangeMode(changeMode);
  const normalizedScheduledStartTime = normalizeScheduledStartTime(
    scheduledStartTime
  );
  const normalizedCurrentTemplateId = normalizePositiveInt(currentTemplateId);
  if (normalizedCurrentTemplateId && normalizedCurrentTemplateId === template.id) {
    return null;
  }
  const reusableOrder = await findReusableTeamSubscriptionCheckoutOrder({
    teamId: normalizedTeamId,
    templateId: template.id,
    changeMode: normalizedChangeMode,
    scheduledStartTime: normalizedScheduledStartTime
  });
  if (reusableOrder) {
    return reusableOrder;
  }

  const currentTemplate = normalizedCurrentTemplateId
    ? await getSubscriptionTemplateById(normalizedCurrentTemplateId)
    : null;
  const planRelation = classifySubscriptionPlanRelation({
    currentTemplate,
    nextTemplate: template
  });
  const trialTarget = resolveSubscriptionTrialUsageTarget({
    targetType: 'team',
    targetTeamId: normalizedTeamId
  });
  const trialEligibility = await isSubscriptionTemplateTrialEligible({
    template,
    target: trialTarget
  });

  const templateSnapshot = createCheckoutTemplateSnapshot(template);
  const metadata: CheckoutOrderMetadata = {
    schemaVersion: CHECKOUT_ORDER_METADATA_VERSION,
    subscription: {
      templateSnapshot,
      changeMode: normalizedChangeMode,
      currentAssignmentId: normalizePositiveInt(currentAssignmentId),
      currentTemplateId: normalizedCurrentTemplateId,
      scheduledStartTime: normalizedScheduledStartTime,
      categoryKey: trialEligibility.categoryKey,
      hierarchyRank: template.hierarchyRank,
      planRelation,
      trialEligible: trialEligibility.trialEligible
    }
  };

  const serializedMetadata = serializeCheckoutOrderMetadata(metadata);
  if (!serializedMetadata) {
    return null;
  }

  const safeSource = normalizeText(source, 30) || 'pricing';
  const expiresAt = new Date(Date.now() + Math.max(5 * 60 * 1000, expiresInMs));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const checkoutToken = buildCheckoutOrderToken();
    const idempotencyKey = `sub:${normalizedTeamId}:${normalizedUserId}:${template.id}:${Date.now()}:${attempt}`;

    try {
      const [created] = await db
        .insert(checkoutOrders)
        .values({
          checkoutToken,
          idempotencyKey,
          orderType: 'subscription',
          status: 'ready',
          source: safeSource,
          teamId: normalizedTeamId,
          targetType: 'team',
          targetTeamId: normalizedTeamId,
          targetUserId: null,
          subscriptionTemplateId: template.id,
          selectedProvider: null,
          selectedPaymentMethod: null,
          providerSessionId: null,
          providerReferenceId: null,
          amount: normalizeAmount(template.priceCents),
          currency: normalizeText(template.currency, 10)?.toUpperCase() ?? null,
          planName: normalizeText(template.name, 100),
          metadata: serializedMetadata,
          expiresAt,
          completedAt: null,
          canceledAt: null,
          failedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return created ? toCheckoutOrderWithMetadata(created) : null;
    } catch (error) {
      if (attempt === 4) {
        console.error('Unable to create subscription checkout order:', error);
      }
    }
  }

  return null;
}

export async function createUserSubscriptionCheckoutOrder({
  userId,
  template,
  changeMode,
  currentAssignmentId,
  currentTemplateId,
  scheduledStartTime,
  source = 'pricing',
  expiresInMs = DEFAULT_CHECKOUT_ORDER_EXPIRES_IN_MS
}: {
  userId: number;
  template: SubscriptionTemplate;
  changeMode?: 'immediate' | 'period_end' | null;
  currentAssignmentId?: number | null;
  currentTemplateId?: number | null;
  scheduledStartTime?: string | null;
  source?: string;
  expiresInMs?: number;
}): Promise<CheckoutOrderWithMetadata | null> {
  const normalizedUserId = normalizePositiveInt(userId);
  if (!normalizedUserId) {
    return null;
  }

  if (
    !isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: 'user',
      templateTargetScope: template.targetScope
    })
  ) {
    return null;
  }

  const normalizedChangeMode = normalizeChangeMode(changeMode);
  const normalizedScheduledStartTime = normalizeScheduledStartTime(
    scheduledStartTime
  );
  const normalizedCurrentTemplateId = normalizePositiveInt(currentTemplateId);
  if (normalizedCurrentTemplateId && normalizedCurrentTemplateId === template.id) {
    return null;
  }

  const reusableOrder = await findReusableUserSubscriptionCheckoutOrder({
    userId: normalizedUserId,
    templateId: template.id,
    changeMode: normalizedChangeMode,
    scheduledStartTime: normalizedScheduledStartTime
  });
  if (reusableOrder) {
    return reusableOrder;
  }

  const currentTemplate = normalizedCurrentTemplateId
    ? await getSubscriptionTemplateById(normalizedCurrentTemplateId)
    : null;
  const planRelation = classifySubscriptionPlanRelation({
    currentTemplate,
    nextTemplate: template
  });
  const trialTarget = resolveSubscriptionTrialUsageTarget({
    targetType: 'user',
    targetUserId: normalizedUserId
  });
  const trialEligibility = await isSubscriptionTemplateTrialEligible({
    template,
    target: trialTarget
  });

  const templateSnapshot = createCheckoutTemplateSnapshot(template);
  const metadata: CheckoutOrderMetadata = {
    schemaVersion: CHECKOUT_ORDER_METADATA_VERSION,
    subscription: {
      templateSnapshot,
      changeMode: normalizedChangeMode,
      currentAssignmentId: normalizePositiveInt(currentAssignmentId),
      currentTemplateId: normalizedCurrentTemplateId,
      scheduledStartTime: normalizedScheduledStartTime,
      categoryKey: trialEligibility.categoryKey,
      hierarchyRank: template.hierarchyRank,
      planRelation,
      trialEligible: trialEligibility.trialEligible
    }
  };

  const serializedMetadata = serializeCheckoutOrderMetadata(metadata);
  if (!serializedMetadata) {
    return null;
  }

  const safeSource = normalizeText(source, 30) || 'pricing';
  const expiresAt = new Date(Date.now() + Math.max(5 * 60 * 1000, expiresInMs));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const checkoutToken = buildCheckoutOrderToken();
    const idempotencyKey = `sub:user:${normalizedUserId}:${template.id}:${Date.now()}:${attempt}`;

    try {
      const [created] = await db
        .insert(checkoutOrders)
        .values({
          checkoutToken,
          idempotencyKey,
          orderType: 'subscription',
          status: 'ready',
          source: safeSource,
          teamId: null,
          targetType: 'user',
          targetTeamId: null,
          targetUserId: normalizedUserId,
          subscriptionTemplateId: template.id,
          selectedProvider: null,
          selectedPaymentMethod: null,
          providerSessionId: null,
          providerReferenceId: null,
          amount: normalizeAmount(template.priceCents),
          currency: normalizeText(template.currency, 10)?.toUpperCase() ?? null,
          planName: normalizeText(template.name, 100),
          metadata: serializedMetadata,
          expiresAt,
          completedAt: null,
          canceledAt: null,
          failedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return created ? toCheckoutOrderWithMetadata(created) : null;
    } catch (error) {
      if (attempt === 4) {
        console.error('Unable to create user subscription checkout order:', error);
      }
    }
  }

  return null;
}

export async function createOneTimeCheckoutOrder({
  moduleId,
  source = 'module',
  teamId = null,
  targetType,
  targetTeamId = null,
  targetUserId = null,
  amount,
  currency,
  planName = null,
  paymentMethodId = null,
  idempotencyKey = null,
  metadata = null,
  expiresInMs = DEFAULT_CHECKOUT_ORDER_EXPIRES_IN_MS
}: {
  moduleId: string;
  source?: string;
  teamId?: number | null;
  targetType: 'team' | 'user';
  targetTeamId?: number | null;
  targetUserId?: number | null;
  amount: number;
  currency: string;
  planName?: string | null;
  paymentMethodId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresInMs?: number;
}): Promise<CheckoutOrderWithMetadata | null> {
  const normalizedModuleId = normalizeText(moduleId, 120);
  const normalizedSource = normalizeText(source, 30) || 'module';
  const normalizedAmount = normalizeAmount(amount);
  const normalizedCurrency = normalizeText(currency, 10)?.toUpperCase() ?? null;
  const normalizedTargetType = normalizeTargetType(targetType);
  const normalizedTeamId = normalizePositiveInt(teamId);
  const normalizedTargetTeamId = normalizePositiveInt(targetTeamId);
  const normalizedTargetUserId = normalizePositiveInt(targetUserId);
  const normalizedPaymentMethodId = normalizeText(paymentMethodId, 60);
  const normalizedIdempotencyKey = normalizeText(idempotencyKey, 120);
  const normalizedMetadata = normalizeMetadataRecord(metadata);

  if (
    !normalizedModuleId ||
    !normalizedTargetType ||
    normalizedAmount === null ||
    !normalizedCurrency
  ) {
    return null;
  }

  if (normalizedTargetType === 'team' && !normalizedTargetTeamId) {
    return null;
  }

  if (normalizedTargetType === 'user' && !normalizedTargetUserId) {
    return null;
  }

  if (normalizedIdempotencyKey) {
    const existing = await getCheckoutOrderByIdempotencyKey(
      normalizedIdempotencyKey
    );
    if (existing) {
      return existing;
    }
  }

  const expiresAt = new Date(Date.now() + Math.max(5 * 60 * 1000, expiresInMs));
  const metadataEnvelope: CheckoutOrderMetadata = {
    ...(normalizedMetadata || {}),
    schemaVersion: CHECKOUT_ORDER_METADATA_VERSION,
    oneTime: {
      moduleId: normalizedModuleId,
      intentId:
        typeof normalizedMetadata?.intentId === 'number' &&
        Number.isInteger(normalizedMetadata.intentId) &&
        normalizedMetadata.intentId > 0
          ? normalizedMetadata.intentId
          : null,
      intentKey:
        typeof normalizedMetadata?.intentKey === 'string'
          ? normalizeText(normalizedMetadata.intentKey, 160)
          : null,
      productId:
        typeof normalizedMetadata?.productId === 'number' &&
        Number.isInteger(normalizedMetadata.productId) &&
        normalizedMetadata.productId > 0
          ? normalizedMetadata.productId
          : null,
      productKey:
        typeof normalizedMetadata?.productKey === 'string'
          ? normalizeText(normalizedMetadata.productKey, 160)
          : null,
      quantity:
        typeof normalizedMetadata?.quantity === 'number' &&
        Number.isInteger(normalizedMetadata.quantity) &&
        normalizedMetadata.quantity > 0
          ? normalizedMetadata.quantity
          : null,
      paymentMethodId: normalizedPaymentMethodId,
      provider:
        typeof normalizedMetadata?.provider === 'string'
          ? normalizeText(normalizedMetadata.provider, 60)
          : null,
      snapshot: normalizeMetadataRecord(normalizedMetadata?.snapshot)
    }
  };
  const serializedMetadata = serializeCheckoutOrderMetadata(metadataEnvelope);
  if (!serializedMetadata) {
    return null;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const checkoutToken = buildCheckoutOrderToken();

    try {
      const [created] = await db
        .insert(checkoutOrders)
        .values({
          checkoutToken,
          idempotencyKey: normalizedIdempotencyKey,
          orderType: 'one_time',
          status: 'ready',
          source: normalizedSource,
          moduleId: normalizedModuleId,
          teamId:
            normalizedTeamId ??
            (normalizedTargetType === 'team' ? normalizedTargetTeamId : null),
          targetType: normalizedTargetType,
          targetTeamId:
            normalizedTargetType === 'team' ? normalizedTargetTeamId : null,
          targetUserId:
            normalizedTargetType === 'user' ? normalizedTargetUserId : null,
          subscriptionTemplateId: null,
          selectedProvider: null,
          selectedPaymentMethod: null,
          providerSessionId: null,
          providerReferenceId: null,
          amount: normalizedAmount,
          currency: normalizedCurrency,
          planName: normalizeText(planName, 100),
          metadata: serializedMetadata,
          expiresAt,
          completedAt: null,
          canceledAt: null,
          failedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (created) {
        return toCheckoutOrderWithMetadata(created);
      }
    } catch (error) {
      if (normalizedIdempotencyKey) {
        const existing = await getCheckoutOrderByIdempotencyKey(
          normalizedIdempotencyKey
        );
        if (existing) {
          return existing;
        }
      }

      if (attempt === 4) {
        console.error('Unable to create one-time checkout order:', error);
      }
    }
  }

  return null;
}

export async function createOneTimeCheckoutOrderStart({
  origin = null,
  ...input
}: {
  moduleId: string;
  source?: string;
  teamId?: number | null;
  targetType: 'team' | 'user';
  targetTeamId?: number | null;
  targetUserId?: number | null;
  amount: number;
  currency: string;
  planName?: string | null;
  paymentMethodId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresInMs?: number;
  origin?: string | null;
}): Promise<OneTimeCheckoutOrderStartResult | null> {
  const checkoutOrder = await createOneTimeCheckoutOrder(input);
  if (!checkoutOrder) {
    return null;
  }

  const checkoutPath = buildCheckoutOrderPath(checkoutOrder.checkoutToken);
  const checkoutUrl = buildCheckoutOrderUrl({
    checkoutToken: checkoutOrder.checkoutToken,
    origin
  });
  if (!checkoutPath || !checkoutUrl) {
    return null;
  }

  return {
    checkoutOrder,
    checkoutPath,
    checkoutUrl
  };
}

function isCheckoutOrderReusableStatus(status: CheckoutOrderStatus) {
  return status === 'ready' || status === 'provider_pending';
}

export function isCheckoutOrderPayable(order: CheckoutOrderWithMetadata) {
  if (!isCheckoutOrderReusableStatus(order.status as CheckoutOrderStatus)) {
    return false;
  }

  if (resolveCheckoutOrderExpiration(order.expiresAt)) {
    return false;
  }

  return true;
}

export async function markCheckoutOrderProviderPending({
  checkoutOrderId,
  provider,
  paymentMethod,
  providerSessionId
}: {
  checkoutOrderId: number;
  provider: CheckoutOrderPaymentProvider;
  paymentMethod?: string | null;
  providerSessionId?: string | null;
}) {
  const normalizedCheckoutOrderId = normalizePositiveInt(checkoutOrderId);
  const normalizedProvider = normalizeText(provider, 30);
  if (!normalizedCheckoutOrderId || !normalizedProvider) {
    return null;
  }

  const [updated] = await db
    .update(checkoutOrders)
    .set({
      status: 'provider_pending',
      selectedProvider: normalizedProvider,
      selectedPaymentMethod: normalizeText(paymentMethod, 60),
      providerSessionId: normalizeText(providerSessionId, 255),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(checkoutOrders.id, normalizedCheckoutOrderId),
        inArray(checkoutOrders.status, ['ready', 'provider_pending'])
      )
    )
    .returning();

  if (!updated) {
    return null;
  }

  return toCheckoutOrderWithMetadata(updated);
}

export async function markCheckoutOrderCompleted({
  checkoutOrderId,
  provider,
  providerReferenceId
}: {
  checkoutOrderId: number;
  provider?: CheckoutOrderPaymentProvider | null;
  providerReferenceId?: string | null;
}) {
  const normalizedCheckoutOrderId = normalizePositiveInt(checkoutOrderId);
  if (!normalizedCheckoutOrderId) {
    return null;
  }

  const [updated] = await db
    .update(checkoutOrders)
    .set({
      status: 'completed',
      selectedProvider: normalizeText(provider ?? null, 30),
      providerReferenceId: normalizeText(providerReferenceId, 255),
      completedAt: new Date(),
      failedAt: null,
      canceledAt: null,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(checkoutOrders.id, normalizedCheckoutOrderId),
        inArray(checkoutOrders.status, ['ready', 'provider_pending', 'completed'])
      )
    )
    .returning();

  if (!updated) {
    return null;
  }

  return toCheckoutOrderWithMetadata(updated);
}

export async function markCheckoutOrderFailed({
  checkoutOrderId,
  provider,
  providerReferenceId
}: {
  checkoutOrderId: number;
  provider?: CheckoutOrderPaymentProvider | null;
  providerReferenceId?: string | null;
}) {
  const normalizedCheckoutOrderId = normalizePositiveInt(checkoutOrderId);
  if (!normalizedCheckoutOrderId) {
    return null;
  }

  const [updated] = await db
    .update(checkoutOrders)
    .set({
      status: 'failed',
      selectedProvider: normalizeText(provider ?? null, 30),
      providerReferenceId: normalizeText(providerReferenceId, 255),
      failedAt: new Date(),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(checkoutOrders.id, normalizedCheckoutOrderId),
        inArray(checkoutOrders.status, ['ready', 'provider_pending', 'failed'])
      )
    )
    .returning();

  if (!updated) {
    return null;
  }

  return toCheckoutOrderWithMetadata(updated);
}

export async function markCheckoutOrderCanceled({
  checkoutOrderId,
  provider
}: {
  checkoutOrderId: number;
  provider?: CheckoutOrderPaymentProvider | null;
}) {
  const normalizedCheckoutOrderId = normalizePositiveInt(checkoutOrderId);
  if (!normalizedCheckoutOrderId) {
    return null;
  }

  const [updated] = await db
    .update(checkoutOrders)
    .set({
      status: 'canceled',
      selectedProvider: normalizeText(provider ?? null, 30),
      canceledAt: new Date(),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(checkoutOrders.id, normalizedCheckoutOrderId),
        inArray(checkoutOrders.status, ['ready', 'provider_pending', 'canceled'])
      )
    )
    .returning();

  if (!updated) {
    return null;
  }

  return toCheckoutOrderWithMetadata(updated);
}
