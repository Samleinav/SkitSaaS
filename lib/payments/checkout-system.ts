import { createHash } from 'node:crypto';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  subscriptionAssignments,
  teamMembers,
  teams,
  users,
  type SubscriptionTemplate
} from '@/lib/db/schema';
import { sendSmtpEmail } from '@/lib/email/smtp';
import { buildTemplatePricingChangedEmail } from '@/lib/email/templates/template-pricing-change';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import { emitEvent, emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { createPaymentLog } from './logs';
import {
  type PaymentOrderTargetType,
  type PaymentOrderType,
  type PaymentOrderSource,
  type PaymentOrderStatus,
  upsertPaymentOrder
} from './orders';
import { runPaymentOrderSubscriptionLifecycle } from './order-subscription-events';
import { persistPaymentSettlementTransaction } from './transactions';

type TemplateSnapshotSource = Pick<
  SubscriptionTemplate,
  | 'id'
  | 'name'
  | 'targetScope'
  | 'billingInterval'
  | 'priceCents'
  | 'compareAtPriceCents'
  | 'currency'
  | 'trialPeriodDays'
  | 'updatedAt'
>;

type TemplatePricingComparable = Pick<
  SubscriptionTemplate,
  | 'billingInterval'
  | 'priceCents'
  | 'compareAtPriceCents'
  | 'currency'
  | 'trialPeriodDays'
>;

type CheckoutLogStatus = 'info' | 'success' | 'failed';
type CheckoutProviderMetadata = Record<string, unknown>;

type EventActorContext = {
  actorUserId?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  source?: string | null;
};

export const CHECKOUT_SYSTEM_EVENTS = {
  checkoutCompleted: 'checkout.completed',
  subscriptionTemplatePricingChanged: 'subscription.template.pricing_changed',
  subscriptionTemplatePricingChangeEmailsQueued:
    'subscription.template.pricing_changed.email_notifications',
  subscriptionTemplateActiveUpdateQueued:
    'subscription.template.active_update_queued',
  subscriptionTemplateActiveUpdateRequested:
    'subscription.template.active_update_requested'
} as const;

const MAX_TEMPLATE_PRICING_CHANGE_EMAIL_RECIPIENTS = 500;
const MAX_MANUAL_TEMPLATE_UPDATE_QUEUE_ITEMS = 500;
const MANUAL_TEMPLATE_UPDATE_ELIGIBLE_TEAM_STATUSES = [
  'trialing',
  'active',
  'unpaid'
] as const;
const CHECKOUT_EVENT_METADATA_SCHEMA_VERSION = 1 as const;

export type CheckoutTemplateSnapshot = {
  templateId: number;
  templateName: string;
  targetScope: string;
  billingInterval: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
  trialPeriodDays: number;
  updatedAt: string;
  fingerprint: string;
};

function normalizeCurrency(currency: string) {
  return currency.trim().toUpperCase();
}

function getTemplateFingerprint(template: TemplateSnapshotSource) {
  const payload = JSON.stringify({
    id: template.id,
    billingInterval: template.billingInterval,
    priceCents: template.priceCents,
    compareAtPriceCents: template.compareAtPriceCents ?? null,
    currency: normalizeCurrency(template.currency),
    trialPeriodDays: template.trialPeriodDays
  });

  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

type CheckoutEventMetadataEnvelope = {
  schemaVersion: typeof CHECKOUT_EVENT_METADATA_SCHEMA_VERSION;
  provider: string;
  eventType: string;
  source: PaymentOrderSource;
  identifiers: {
    externalOrderId: string | null;
    externalPaymentId: string | null;
    externalLogId: string | null;
    providerPlanId: string | null;
  };
  providerMetadata: Record<string, CheckoutProviderMetadata> | null;
};

function normalizeCheckoutMetadataObject(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const entries = Object.entries(metadata as Record<string, unknown>).filter(
    ([, value]) => value !== undefined && value !== null
  );

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries);
}

function mergeEventMetadata({
  provider,
  eventType,
  source,
  externalOrderId,
  externalPaymentId,
  externalLogId,
  providerPlanId,
  metadata,
  providerMetadata,
  templateSnapshot
}: {
  provider: string;
  eventType: string;
  source: PaymentOrderSource;
  externalOrderId: string | null;
  externalPaymentId: string | null;
  externalLogId: string | null;
  providerPlanId: string | null;
  metadata: unknown;
  providerMetadata?: CheckoutProviderMetadata | null;
  templateSnapshot?: CheckoutTemplateSnapshot | null;
}) {
  const normalizedMetadata = normalizeCheckoutMetadataObject(metadata);
  const normalizedProviderMetadata =
    normalizeCheckoutMetadataObject(providerMetadata);

  const eventMetadata: Record<string, unknown> = {
    ...(normalizedMetadata || {}),
    checkoutContext: {
      schemaVersion: CHECKOUT_EVENT_METADATA_SCHEMA_VERSION,
      provider,
      eventType,
      source,
      identifiers: {
        externalOrderId,
        externalPaymentId,
        externalLogId,
        providerPlanId
      },
      providerMetadata: normalizedProviderMetadata
        ? { [provider]: normalizedProviderMetadata }
        : null
    } as CheckoutEventMetadataEnvelope
  };

  if (!normalizedMetadata && metadata !== undefined) {
    eventMetadata.context = metadata;
  }

  if (templateSnapshot) {
    eventMetadata.templateSnapshot = templateSnapshot;
  }

  return eventMetadata;
}

function mapOrderStatusToLogStatus(status: PaymentOrderStatus): CheckoutLogStatus {
  if (status === 'received') {
    return 'success';
  }

  if (status === 'failed') {
    return 'failed';
  }

  return 'info';
}

export function createCheckoutTemplateSnapshot(
  template: TemplateSnapshotSource
): CheckoutTemplateSnapshot {
  return {
    templateId: template.id,
    templateName: template.name,
    targetScope: template.targetScope,
    billingInterval: template.billingInterval,
    priceCents: template.priceCents,
    compareAtPriceCents: template.compareAtPriceCents ?? null,
    currency: normalizeCurrency(template.currency),
    trialPeriodDays: template.trialPeriodDays,
    updatedAt: template.updatedAt.toISOString(),
    fingerprint: getTemplateFingerprint(template)
  };
}

export function hasCheckoutTemplatePricingChanged(
  previousTemplate: TemplatePricingComparable,
  nextTemplate: TemplatePricingComparable
) {
  return (
    previousTemplate.billingInterval !== nextTemplate.billingInterval ||
    previousTemplate.priceCents !== nextTemplate.priceCents ||
    (previousTemplate.compareAtPriceCents ?? null) !==
      (nextTemplate.compareAtPriceCents ?? null) ||
    normalizeCurrency(previousTemplate.currency) !==
      normalizeCurrency(nextTemplate.currency) ||
    previousTemplate.trialPeriodDays !== nextTemplate.trialPeriodDays
  );
}

export type RecordCheckoutEventInput = {
  provider: string;
  orderType?: PaymentOrderType;
  moduleId?: string | null;
  status?: PaymentOrderStatus;
  logStatus?: CheckoutLogStatus;
  persistOrder?: boolean;
  eventType: string;
  source?: PaymentOrderSource;
  teamId?: number | null;
  targetType?: PaymentOrderTargetType | null;
  targetTeamId?: number | null;
  targetUserId?: number | null;
  subscriptionTemplateId?: number | null;
  templateSnapshot?: CheckoutTemplateSnapshot | null;
  paymentMethod?: string | null;
  planName?: string | null;
  providerPlanId?: string | null;
  externalOrderId?: string | null;
  externalPaymentId?: string | null;
  externalLogId?: string | null;
  amount?: number | null;
  currency?: string | null;
  message?: string | null;
  metadata?: unknown;
  providerMetadata?: CheckoutProviderMetadata | null;
};

type CheckoutProviderAdapterInput<TProviderMetadata extends CheckoutProviderMetadata> =
  Omit<RecordCheckoutEventInput, 'provider' | 'paymentMethod' | 'providerMetadata'> & {
    paymentMethod?: string | null;
    providerMetadata?: TProviderMetadata | null;
  };

type CheckoutProviderAdapterOptions<
  TProviderMetadata extends CheckoutProviderMetadata
> = {
  provider: string;
  defaultPaymentMethod?: string | null;
  normalizeProviderMetadata?: (
    providerMetadata: TProviderMetadata | null
  ) => CheckoutProviderMetadata | null;
};

function compactProviderMetadata<T extends CheckoutProviderMetadata>(
  metadata: T | null | undefined
) {
  if (!metadata) {
    return null;
  }

  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== undefined && value !== null
  );

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries) as T;
}

export function createCheckoutEventProviderAdapter<
  TProviderMetadata extends CheckoutProviderMetadata = CheckoutProviderMetadata
>({
  provider,
  defaultPaymentMethod = null,
  normalizeProviderMetadata
}: CheckoutProviderAdapterOptions<TProviderMetadata>) {
  return async function recordProviderCheckoutEvent({
    paymentMethod,
    providerMetadata = null,
    ...input
  }: CheckoutProviderAdapterInput<TProviderMetadata>) {
    const resolvedPaymentMethod =
      paymentMethod === undefined ? defaultPaymentMethod : paymentMethod;
    const normalizedProviderMetadata = normalizeProviderMetadata
      ? normalizeProviderMetadata(providerMetadata)
      : compactProviderMetadata(providerMetadata);

    await recordCheckoutEvent({
      ...input,
      provider,
      paymentMethod: resolvedPaymentMethod,
      providerMetadata: normalizedProviderMetadata
    });
  };
}

export type StripeCheckoutProviderMetadata = {
  sessionId?: string | null;
  customerId?: string | null;
  productId?: string | null;
  subscriptionId?: string | null;
  webhookEventId?: string | null;
  paymentIntentId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: string | null;
};

export type PayPalCheckoutProviderMetadata = {
  subscriptionId?: string | null;
  orderId?: string | null;
  planId?: string | null;
  webhookEventId?: string | null;
  payerId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: string | null;
};

export type SystemCheckoutProviderMetadata = {
  reason?: string | null;
  targetScope?: string | null;
  targetType?: string | null;
  teamName?: string | null;
  paymentProvider?: string | null;
  subscriptionStatus?: string | null;
  userId?: number | null;
  userEmail?: string | null;
  userName?: string | null;
};

function normalizeStripeCheckoutProviderMetadata(
  providerMetadata: StripeCheckoutProviderMetadata | null
) {
  return compactProviderMetadata({
    sessionId: providerMetadata?.sessionId,
    customerId: providerMetadata?.customerId,
    productId: providerMetadata?.productId,
    subscriptionId: providerMetadata?.subscriptionId,
    webhookEventId: providerMetadata?.webhookEventId,
    paymentIntentId: providerMetadata?.paymentIntentId,
    currentPeriodStart: providerMetadata?.currentPeriodStart,
    currentPeriodEnd: providerMetadata?.currentPeriodEnd,
    trialEndsAt: providerMetadata?.trialEndsAt,
    cancelAtPeriodEnd: providerMetadata?.cancelAtPeriodEnd,
    canceledAt: providerMetadata?.canceledAt
  });
}

function normalizePayPalCheckoutProviderMetadata(
  providerMetadata: PayPalCheckoutProviderMetadata | null
) {
  return compactProviderMetadata({
    subscriptionId: providerMetadata?.subscriptionId,
    orderId: providerMetadata?.orderId,
    planId: providerMetadata?.planId,
    webhookEventId: providerMetadata?.webhookEventId,
    payerId: providerMetadata?.payerId,
    currentPeriodStart: providerMetadata?.currentPeriodStart,
    currentPeriodEnd: providerMetadata?.currentPeriodEnd,
    trialEndsAt: providerMetadata?.trialEndsAt,
    cancelAtPeriodEnd: providerMetadata?.cancelAtPeriodEnd,
    canceledAt: providerMetadata?.canceledAt
  });
}

function normalizeSystemCheckoutProviderMetadata(
  providerMetadata: SystemCheckoutProviderMetadata | null
) {
  return compactProviderMetadata({
    reason: providerMetadata?.reason,
    targetScope: providerMetadata?.targetScope,
    targetType: providerMetadata?.targetType,
    teamName: providerMetadata?.teamName,
    paymentProvider: providerMetadata?.paymentProvider,
    subscriptionStatus: providerMetadata?.subscriptionStatus,
    userId: providerMetadata?.userId,
    userEmail: providerMetadata?.userEmail,
    userName: providerMetadata?.userName
  });
}

export const recordStripeCheckoutEvent =
  createCheckoutEventProviderAdapter<StripeCheckoutProviderMetadata>({
    provider: 'stripe',
    defaultPaymentMethod: 'card',
    normalizeProviderMetadata: normalizeStripeCheckoutProviderMetadata
  });

export const recordPayPalCheckoutEvent =
  createCheckoutEventProviderAdapter<PayPalCheckoutProviderMetadata>({
    provider: 'paypal',
    defaultPaymentMethod: 'paypal',
    normalizeProviderMetadata: normalizePayPalCheckoutProviderMetadata
  });

export const recordSystemCheckoutEvent =
  createCheckoutEventProviderAdapter<SystemCheckoutProviderMetadata>({
    provider: 'system',
    defaultPaymentMethod: 'manual',
    normalizeProviderMetadata: normalizeSystemCheckoutProviderMetadata
  });

type RecordCheckoutEventDeps = {
  emitEvent: typeof emitEvent;
  createPaymentLog: typeof createPaymentLog;
  upsertPaymentOrder: typeof upsertPaymentOrder;
  persistPaymentSettlementTransaction: typeof persistPaymentSettlementTransaction;
  emitEventAsync: typeof emitEventAsync;
  runPaymentOrderSubscriptionLifecycle: typeof runPaymentOrderSubscriptionLifecycle;
};

const DEFAULT_RECORD_CHECKOUT_EVENT_DEPS: RecordCheckoutEventDeps = {
  emitEvent,
  createPaymentLog,
  upsertPaymentOrder,
  persistPaymentSettlementTransaction,
  emitEventAsync,
  runPaymentOrderSubscriptionLifecycle
};

export async function recordCheckoutEvent({
  provider,
  orderType = 'subscription',
  moduleId = null,
  status = 'pending',
  logStatus,
  persistOrder = true,
  eventType,
  source = 'system',
  teamId = null,
  targetType = null,
  targetTeamId = null,
  targetUserId = null,
  subscriptionTemplateId = null,
  templateSnapshot = null,
  paymentMethod = null,
  planName = null,
  providerPlanId = null,
  externalOrderId = null,
  externalPaymentId = null,
  externalLogId = null,
  amount = null,
  currency = null,
  message = null,
  metadata,
  providerMetadata = null
}: RecordCheckoutEventInput,
deps: RecordCheckoutEventDeps = DEFAULT_RECORD_CHECKOUT_EVENT_DEPS) {
  const orderPayload: RecordCheckoutEventInput = {
    provider,
    orderType,
    moduleId,
    status,
    logStatus,
    persistOrder,
    eventType,
    source,
    teamId,
    targetType,
    targetTeamId,
    targetUserId,
    subscriptionTemplateId,
    templateSnapshot,
    paymentMethod,
    planName,
    providerPlanId,
    externalOrderId,
    externalPaymentId,
    externalLogId,
    amount,
    currency,
    message,
    metadata,
    providerMetadata
  };

  await deps.emitEvent(
    EVENT_HOOKS.checkoutBeforeCreateOrder,
    orderPayload,
    {
      teamId: orderPayload.teamId ?? null,
      targetUserId: orderPayload.targetUserId ?? null,
      source: '/lib/payments/checkout-system'
    }
  );

  const eventMetadata = mergeEventMetadata({
    provider: orderPayload.provider,
    eventType: orderPayload.eventType,
    source: orderPayload.source ?? 'system',
    externalOrderId: orderPayload.externalOrderId ?? null,
    externalPaymentId: orderPayload.externalPaymentId ?? null,
    externalLogId: orderPayload.externalLogId ?? null,
    providerPlanId: orderPayload.providerPlanId ?? null,
    metadata: orderPayload.metadata,
    providerMetadata: orderPayload.providerMetadata,
    templateSnapshot: orderPayload.templateSnapshot
  });

  const paymentLogPromise = deps.createPaymentLog({
    provider: orderPayload.provider,
    eventType: orderPayload.eventType,
    status:
      orderPayload.logStatus ??
      mapOrderStatusToLogStatus(orderPayload.status ?? 'pending'),
    teamId: orderPayload.teamId ?? null,
    externalId:
      orderPayload.externalLogId ||
      orderPayload.externalPaymentId ||
      orderPayload.externalOrderId ||
      null,
    amount: orderPayload.amount ?? null,
    currency: orderPayload.currency ?? null,
    message: orderPayload.message ?? null,
    payload: eventMetadata
  });

  const paymentOrderPromise = orderPayload.persistOrder
    ? deps.upsertPaymentOrder({
        provider: orderPayload.provider,
        orderType: orderPayload.orderType ?? 'subscription',
        moduleId: orderPayload.moduleId ?? null,
        status: orderPayload.status ?? 'pending',
        eventType: orderPayload.eventType,
        source: orderPayload.source ?? 'system',
        teamId: orderPayload.teamId ?? null,
        targetType: orderPayload.targetType ?? null,
        targetTeamId: orderPayload.targetTeamId ?? null,
        targetUserId: orderPayload.targetUserId ?? null,
        subscriptionTemplateId:
          orderPayload.subscriptionTemplateId ??
          orderPayload.templateSnapshot?.templateId ??
          null,
        paymentMethod: orderPayload.paymentMethod ?? null,
        planName:
          orderPayload.planName ||
          orderPayload.templateSnapshot?.templateName ||
          null,
        providerPlanId: orderPayload.providerPlanId ?? null,
        externalOrderId: orderPayload.externalOrderId ?? null,
        externalPaymentId: orderPayload.externalPaymentId ?? null,
        amount: orderPayload.amount ?? null,
        currency: orderPayload.currency ?? null,
        message: orderPayload.message ?? null,
        metadata: eventMetadata
      })
    : Promise.resolve(null);

  const [, persistedOrder] = await Promise.all([
    paymentLogPromise,
    paymentOrderPromise
  ]);

  if (
    orderPayload.status === 'received' ||
    orderPayload.status === 'canceled' ||
    orderPayload.status === 'failed'
  ) {
    await deps.persistPaymentSettlementTransaction({
      orderId: persistedOrder?.id ?? null,
      provider: orderPayload.provider,
      orderStatus: orderPayload.status,
      amount: orderPayload.amount ?? null,
      currency: orderPayload.currency ?? null,
      externalTransactionId: orderPayload.externalPaymentId ?? null,
      providerEventId: orderPayload.externalLogId ?? null,
      externalInvoiceId: orderPayload.externalOrderId ?? null,
      dedupeKey: [
        orderPayload.provider,
        orderPayload.externalPaymentId || 'no-ext-payment',
        orderPayload.externalLogId || 'no-log',
        persistedOrder?.id || 'no-order',
        orderPayload.status
      ].join(':'),
      payload: eventMetadata,
      metadata: {
        source: '/lib/payments/checkout-system',
        eventType: orderPayload.eventType,
      }
    });
  }

  if (persistedOrder) {
    await deps.emitEventAsync(
      EVENT_HOOKS.checkoutAfterCreateOrder,
      {
        orderId: persistedOrder.id,
        status: persistedOrder.status,
        provider: persistedOrder.provider,
        eventType: persistedOrder.eventType,
        source: persistedOrder.source
      },
      {
        teamId: persistedOrder.teamId ?? null,
        targetUserId: persistedOrder.targetUserId ?? null,
        source: '/lib/payments/checkout-system'
      }
    );

    await deps.emitEventAsync(
      EVENT_HOOKS.paymentOrderStatusChanged,
      {
        orderId: persistedOrder.id,
        status: persistedOrder.status,
        provider: persistedOrder.provider,
        eventType: persistedOrder.eventType,
        source: persistedOrder.source
      },
      {
        teamId: persistedOrder.teamId ?? null,
        targetUserId: persistedOrder.targetUserId ?? null,
        source: '/lib/payments/checkout-system'
      }
    );
  }

  const resolvedOrderType =
    persistedOrder?.orderType ?? orderPayload.orderType ?? 'subscription';
  if (
    resolvedOrderType === 'subscription' &&
    (orderPayload.status === 'received' ||
      orderPayload.status === 'canceled' ||
      orderPayload.status === 'failed')
  ) {
    try {
      await deps.runPaymentOrderSubscriptionLifecycle({
        orderId: persistedOrder?.id ?? null,
        orderType: resolvedOrderType,
        provider: orderPayload.provider,
        status: orderPayload.status,
        eventType: orderPayload.eventType,
        orderSource: orderPayload.source ?? 'system',
        triggerSource: '/lib/payments/checkout-system',
        teamId: persistedOrder?.teamId ?? orderPayload.teamId,
        targetType: persistedOrder?.targetType ?? orderPayload.targetType,
        targetTeamId:
          persistedOrder?.targetTeamId ?? orderPayload.targetTeamId,
        targetUserId: persistedOrder?.targetUserId ?? orderPayload.targetUserId,
        subscriptionTemplateId:
          persistedOrder?.subscriptionTemplateId ??
          orderPayload.subscriptionTemplateId ??
          orderPayload.templateSnapshot?.templateId ??
          null,
        planName:
          persistedOrder?.planName ||
          orderPayload.planName ||
          orderPayload.templateSnapshot?.templateName ||
          null,
        providerPlanId:
          persistedOrder?.providerPlanId || orderPayload.providerPlanId,
        externalPaymentId:
          persistedOrder?.externalPaymentId ||
          orderPayload.externalPaymentId ||
          null,
        metadata: eventMetadata
      });
    } catch (error) {
      console.error(
        'Unable to apply subscription lifecycle from checkout event:',
        error
      );
    }
  }
}

export type QueueTemplatePriceChangeNotificationEmailsInput = {
  templateId: number;
  templateName: string;
  previousSnapshot: CheckoutTemplateSnapshot;
  currentSnapshot: CheckoutTemplateSnapshot;
};

type TemplatePriceChangeRecipient = {
  userId: number;
  email: string;
  name: string | null;
  teamNames: string[];
};

function normalizeTargetScope(targetScope: string) {
  const normalized = targetScope.trim().toLowerCase();
  if (normalized === 'user' || normalized === 'organization') {
    return normalized;
  }

  return null;
}

async function getTemplatePriceChangeRecipients({
  templateId,
  targetScope
}: {
  templateId: number;
  targetScope: 'user' | 'organization';
}): Promise<TemplatePriceChangeRecipient[]> {
  if (targetScope === 'user') {
    const rows = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name
      })
      .from(subscriptionAssignments)
      .innerJoin(
        users,
        eq(subscriptionAssignments.targetUserId, users.id)
      )
      .where(
        and(
          eq(subscriptionAssignments.targetType, 'user'),
          isNull(subscriptionAssignments.effectiveTo),
          eq(subscriptionAssignments.subscriptionTemplateId, templateId),
          isNull(users.deletedAt),
          eq(users.accountStatus, 'active')
        )
      );

    return rows.map((row) => ({
      userId: row.userId,
      email: row.email,
      name: row.name,
      teamNames: []
    }));
  }

  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      teamName: teams.name
    })
    .from(subscriptionAssignments)
    .innerJoin(teams, eq(subscriptionAssignments.targetTeamId, teams.id))
    .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(
      and(
        eq(subscriptionAssignments.targetType, 'team'),
        isNull(subscriptionAssignments.effectiveTo),
        eq(subscriptionAssignments.subscriptionTemplateId, templateId),
        eq(teamMembers.role, 'owner'),
        isNull(users.deletedAt),
        eq(users.accountStatus, 'active')
      )
    );

  const recipientMap = new Map<string, TemplatePriceChangeRecipient>();
  for (const row of rows) {
    const key = `${row.userId}:${row.email.trim().toLowerCase()}`;
    const current = recipientMap.get(key);
    if (!current) {
      recipientMap.set(key, {
        userId: row.userId,
        email: row.email,
        name: row.name,
        teamNames: row.teamName ? [row.teamName] : []
      });
      continue;
    }

    if (row.teamName && !current.teamNames.includes(row.teamName)) {
      current.teamNames.push(row.teamName);
    }
  }

  return Array.from(recipientMap.values());
}

export async function queueTemplatePriceChangeNotificationEmails(
  input: QueueTemplatePriceChangeNotificationEmailsInput
): Promise<void> {
  const targetScope = normalizeTargetScope(input.currentSnapshot.targetScope);
  if (!targetScope) {
    await createSysActivityLog({
      eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChangeEmailsQueued,
      eventCategory: 'system',
      action: 'create',
      status: 'warning',
      entityType: 'subscription_template',
      entityId: String(input.templateId),
      source: '/lib/payments/checkout-system',
      message:
        'Skipped template pricing change emails because target scope is invalid.',
      metadata: {
        targetScope: input.currentSnapshot.targetScope
      }
    });
    return;
  }

  const recipients = await getTemplatePriceChangeRecipients({
    templateId: input.templateId,
    targetScope
  });

  if (recipients.length === 0) {
    await createSysActivityLog({
      eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChangeEmailsQueued,
      eventCategory: 'system',
      action: 'create',
      status: 'info',
      entityType: 'subscription_template',
      entityId: String(input.templateId),
      source: '/lib/payments/checkout-system',
      message:
        'No affected recipients found for template pricing change notification.',
      metadata: {
        targetScope
      }
    });
    return;
  }

  const recipientsToNotify = recipients.slice(
    0,
    MAX_TEMPLATE_PRICING_CHANGE_EMAIL_RECIPIENTS
  );
  const skippedRecipientsCount = Math.max(
    0,
    recipients.length - recipientsToNotify.length
  );

  const baseUrl = process.env.BASE_URL?.trim();
  const pricingUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/pricing`
    : null;

  const sendResults = await Promise.allSettled(
    recipientsToNotify.map(async (recipient) => {
      const emailContent = buildTemplatePricingChangedEmail({
        templateName: input.templateName,
        previousSnapshot: input.previousSnapshot,
        currentSnapshot: input.currentSnapshot,
        recipientName: recipient.name,
        impactedOrganizationNames: recipient.teamNames,
        pricingUrl
      });

      return sendSmtpEmail({
        eventType:
          CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChangeEmailsQueued,
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        source: `/admin/subscriptions/${input.templateId}/edit`,
        metadata: {
          triggerEventType:
            CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChanged,
          templateId: input.templateId,
          templateName: input.templateName,
          targetScope,
          previousSnapshot: input.previousSnapshot,
          currentSnapshot: input.currentSnapshot,
          impactedOrganizationNames: recipient.teamNames,
          emailPreviewText: emailContent.text.slice(0, 500)
        }
      });
    })
  );

  let sentCount = 0;
  let failedCount = 0;

  for (const result of sendResults) {
    if (result.status === 'fulfilled' && result.value.ok) {
      sentCount += 1;
      continue;
    }

    failedCount += 1;
  }

  const summaryStatus =
    failedCount === 0 ? 'success' : sentCount > 0 ? 'warning' : 'failed';

  await createSysActivityLog({
    eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChangeEmailsQueued,
    eventCategory: 'system',
    action: 'create',
    status: summaryStatus,
    entityType: 'subscription_template',
    entityId: String(input.templateId),
    source: '/lib/payments/checkout-system',
    message:
      'Template pricing change notification emails processed for affected users.',
    metadata: {
      targetScope,
      totalRecipients: recipients.length,
      attemptedRecipients: recipientsToNotify.length,
      skippedRecipientsCount,
      sentCount,
      failedCount
    }
  });
}

type ManualTemplateUpdateTarget =
  | {
      targetType: 'team';
      teamId: number;
      teamName: string;
      paymentProvider: string | null;
      subscriptionStatus: string | null;
    }
  | {
      targetType: 'user';
      userId: number;
      userEmail: string;
      userName: string | null;
    };

async function getManualTemplateUpdateTargets({
  templateId,
  targetScope
}: {
  templateId: number;
  targetScope: 'user' | 'organization';
}): Promise<ManualTemplateUpdateTarget[]> {
  if (targetScope === 'user') {
    const rows = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        userName: users.name
      })
      .from(subscriptionAssignments)
      .innerJoin(
        users,
        eq(subscriptionAssignments.targetUserId, users.id)
      )
      .where(
        and(
          eq(subscriptionAssignments.targetType, 'user'),
          isNull(subscriptionAssignments.effectiveTo),
          eq(subscriptionAssignments.subscriptionTemplateId, templateId),
          isNull(users.deletedAt),
          eq(users.accountStatus, 'active')
        )
      );

    return rows.map((row) => ({
      targetType: 'user' as const,
      userId: row.userId,
      userEmail: row.userEmail,
      userName: row.userName
    }));
  }

  const rows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      paymentProvider: subscriptionAssignments.paymentProvider,
      subscriptionStatus: subscriptionAssignments.status
    })
    .from(subscriptionAssignments)
    .innerJoin(teams, eq(subscriptionAssignments.targetTeamId, teams.id))
    .where(
      and(
        eq(subscriptionAssignments.targetType, 'team'),
        isNull(subscriptionAssignments.effectiveTo),
        eq(subscriptionAssignments.subscriptionTemplateId, templateId),
        isNotNull(subscriptionAssignments.paymentProvider),
        inArray(
          subscriptionAssignments.status,
          MANUAL_TEMPLATE_UPDATE_ELIGIBLE_TEAM_STATUSES
        )
      )
    );

  return rows.map((row) => ({
    targetType: 'team' as const,
    teamId: row.teamId,
    teamName: row.teamName,
    paymentProvider: row.paymentProvider,
    subscriptionStatus: row.subscriptionStatus
  }));
}

export type QueueManualActiveSubscriptionTemplateUpdateInput = {
  templateId: number;
  templateName: string;
  templateSnapshot: CheckoutTemplateSnapshot;
  reason: 'pricing_changed' | 'manual_admin_request';
};

export async function queueManualActiveSubscriptionTemplateUpdate(
  input: QueueManualActiveSubscriptionTemplateUpdateInput
): Promise<void> {
  const targetScope = normalizeTargetScope(input.templateSnapshot.targetScope);
  if (!targetScope) {
    await createSysActivityLog({
      eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateQueued,
      eventCategory: 'system',
      action: 'create',
      status: 'warning',
      entityType: 'subscription_template',
      entityId: String(input.templateId),
      source: '/lib/payments/checkout-system',
      message:
        'Skipped active subscription update queue because target scope is invalid.',
      metadata: {
        reason: input.reason,
        targetScope: input.templateSnapshot.targetScope
      }
    });
    return;
  }

  const targets = await getManualTemplateUpdateTargets({
    templateId: input.templateId,
    targetScope
  });

  if (targets.length === 0) {
    await createSysActivityLog({
      eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateQueued,
      eventCategory: 'system',
      action: 'create',
      status: 'info',
      entityType: 'subscription_template',
      entityId: String(input.templateId),
      source: '/lib/payments/checkout-system',
      message: 'No active subscriptions found for template update queue.',
      metadata: {
        reason: input.reason,
        targetScope
      }
    });
    return;
  }

  const targetsToQueue = targets.slice(0, MAX_MANUAL_TEMPLATE_UPDATE_QUEUE_ITEMS);
  const skippedTargetsCount = Math.max(0, targets.length - targetsToQueue.length);

  const queueResults = await Promise.allSettled(
    targetsToQueue.map(async (target) => {
      if (target.targetType === 'team') {
        await recordSystemCheckoutEvent({
          status: 'pending',
          persistOrder: false,
          eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateQueued,
          source: 'system',
          teamId: target.teamId,
          subscriptionTemplateId: input.templateId,
          templateSnapshot: input.templateSnapshot,
          planName: input.templateName,
          amount: input.templateSnapshot.priceCents,
          currency: input.templateSnapshot.currency,
          message: 'Active subscription update queued for organization.',
          metadata: {
            reason: input.reason,
            targetScope,
            targetType: target.targetType,
            teamName: target.teamName,
            paymentProvider: target.paymentProvider,
            subscriptionStatus: target.subscriptionStatus
          },
          providerMetadata: {
            reason: input.reason,
            targetScope,
            targetType: target.targetType,
            teamName: target.teamName,
            paymentProvider: target.paymentProvider,
            subscriptionStatus: target.subscriptionStatus
          }
        });
        return;
      }

      await recordSystemCheckoutEvent({
        status: 'pending',
        persistOrder: false,
        eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateQueued,
        source: 'system',
        subscriptionTemplateId: input.templateId,
        templateSnapshot: input.templateSnapshot,
        planName: input.templateName,
        amount: input.templateSnapshot.priceCents,
        currency: input.templateSnapshot.currency,
        message: 'Active subscription update queued for user.',
        metadata: {
          reason: input.reason,
          targetScope,
          targetType: target.targetType,
          userId: target.userId,
          userEmail: target.userEmail,
          userName: target.userName
        },
        providerMetadata: {
          reason: input.reason,
          targetScope,
          targetType: target.targetType,
          userId: target.userId,
          userEmail: target.userEmail,
          userName: target.userName
        }
      });
    })
  );

  let queuedCount = 0;
  let failedCount = 0;

  for (const result of queueResults) {
    if (result.status === 'fulfilled') {
      queuedCount += 1;
      continue;
    }

    failedCount += 1;
  }

  const summaryStatus =
    failedCount === 0 ? 'success' : queuedCount > 0 ? 'warning' : 'failed';

  await createSysActivityLog({
    eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateQueued,
    eventCategory: 'system',
    action: 'create',
    status: summaryStatus,
    entityType: 'subscription_template',
    entityId: String(input.templateId),
    source: '/lib/payments/checkout-system',
    message: 'Active subscription template update queue processed.',
    metadata: {
      reason: input.reason,
      targetScope,
      totalTargets: targets.length,
      attemptedTargets: targetsToQueue.length,
      queuedCount,
      failedCount,
      skippedTargetsCount
    }
  });
}

export type EmitTemplatePricingChangedEventInput = EventActorContext & {
  templateId: number;
  templateName: string;
  previousSnapshot: CheckoutTemplateSnapshot;
  currentSnapshot: CheckoutTemplateSnapshot;
};

type EmitTemplatePricingChangedEventDeps = {
  createSysActivityLog: typeof createSysActivityLog;
  recordSystemCheckoutEvent: typeof recordSystemCheckoutEvent;
  queueTemplatePriceChangeNotificationEmails:
    typeof queueTemplatePriceChangeNotificationEmails;
  queueManualActiveSubscriptionTemplateUpdate:
    typeof queueManualActiveSubscriptionTemplateUpdate;
};

const DEFAULT_EMIT_TEMPLATE_PRICING_CHANGED_EVENT_DEPS: EmitTemplatePricingChangedEventDeps =
  {
    createSysActivityLog,
    recordSystemCheckoutEvent,
    queueTemplatePriceChangeNotificationEmails,
    queueManualActiveSubscriptionTemplateUpdate
  };

export async function emitTemplatePricingChangedEvent({
  actorUserId = null,
  actorEmail = null,
  actorRole = null,
  source = '/admin/subscriptions',
  templateId,
  templateName,
  previousSnapshot,
  currentSnapshot
}: EmitTemplatePricingChangedEventInput,
deps: EmitTemplatePricingChangedEventDeps =
  DEFAULT_EMIT_TEMPLATE_PRICING_CHANGED_EVENT_DEPS) {
  const message =
    'Subscription template pricing changed. Existing subscriptions require manual migration after user notification.';

  await deps.createSysActivityLog({
    eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChanged,
    eventCategory: 'admin',
    action: 'update',
    status: 'warning',
    actorUserId,
    actorEmail,
    actorRole,
    entityType: 'subscription_template',
    entityId: String(templateId),
    source,
    message,
    metadata: {
      previousSnapshot,
      currentSnapshot
    }
  });

  await deps.recordSystemCheckoutEvent({
    status: 'pending',
    persistOrder: false,
    eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChanged,
    source: 'system',
    subscriptionTemplateId: templateId,
    templateSnapshot: currentSnapshot,
    planName: templateName,
    amount: currentSnapshot.priceCents,
    currency: currentSnapshot.currency,
    message,
    metadata: {
      previousSnapshot,
      currentSnapshot
    },
    providerMetadata: {
      reason: 'pricing_changed',
      targetScope: currentSnapshot.targetScope
    }
  });

  await deps.queueTemplatePriceChangeNotificationEmails({
    templateId,
    templateName,
    previousSnapshot,
    currentSnapshot
  });

  await deps.queueManualActiveSubscriptionTemplateUpdate({
    templateId,
    templateName,
    templateSnapshot: currentSnapshot,
    reason: 'pricing_changed'
  });
}

export type EmitTemplateActiveSubscriptionsUpdateRequestedEventInput =
  EventActorContext & {
    templateId: number;
    templateName: string;
    templateSnapshot: CheckoutTemplateSnapshot;
    reason?: string | null;
  };

type EmitTemplateActiveSubscriptionsUpdateRequestedEventDeps = {
  createSysActivityLog: typeof createSysActivityLog;
  recordSystemCheckoutEvent: typeof recordSystemCheckoutEvent;
  queueManualActiveSubscriptionTemplateUpdate:
    typeof queueManualActiveSubscriptionTemplateUpdate;
};

const DEFAULT_EMIT_TEMPLATE_ACTIVE_SUBSCRIPTIONS_UPDATE_REQUESTED_EVENT_DEPS: EmitTemplateActiveSubscriptionsUpdateRequestedEventDeps =
  {
    createSysActivityLog,
    recordSystemCheckoutEvent,
    queueManualActiveSubscriptionTemplateUpdate
  };

export async function emitTemplateActiveSubscriptionsUpdateRequestedEvent({
  actorUserId = null,
  actorEmail = null,
  actorRole = null,
  source = '/admin/subscriptions',
  templateId,
  templateName,
  templateSnapshot,
  reason = null
}: EmitTemplateActiveSubscriptionsUpdateRequestedEventInput,
deps: EmitTemplateActiveSubscriptionsUpdateRequestedEventDeps =
  DEFAULT_EMIT_TEMPLATE_ACTIVE_SUBSCRIPTIONS_UPDATE_REQUESTED_EVENT_DEPS) {
  const message =
    'Manual active subscription update requested for template. Queue processing has been started.';

  await deps.createSysActivityLog({
    eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateRequested,
    eventCategory: 'admin',
    action: 'event',
    status: 'warning',
    actorUserId,
    actorEmail,
    actorRole,
    entityType: 'subscription_template',
    entityId: String(templateId),
    source,
    message,
    metadata: {
      templateSnapshot,
      reason
    }
  });

  await deps.recordSystemCheckoutEvent({
    status: 'pending',
    persistOrder: false,
    eventType: CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateRequested,
    source: 'system',
    subscriptionTemplateId: templateId,
    templateSnapshot,
    planName: templateName,
    amount: templateSnapshot.priceCents,
    currency: templateSnapshot.currency,
    message,
    metadata: {
      reason
    },
    providerMetadata: {
      reason,
      targetScope: templateSnapshot.targetScope
    }
  });

  await deps.queueManualActiveSubscriptionTemplateUpdate({
    templateId,
    templateName,
    templateSnapshot,
    reason: 'manual_admin_request'
  });
}
