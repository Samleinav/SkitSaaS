import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import type { SubscriptionTemplate, Team, User } from '@/lib/db/schema';
import {
  getTeamByStripeCustomerId,
  getActiveTeamSubscriptionAssignmentByProviderReferenceId,
  getActiveUserSubscriptionAssignmentByProviderReferenceId,
  getUser
} from '@/lib/db/queries';
import { getPaymentConfigValue } from './config';
import { createCheckoutTemplateSnapshot } from './checkout-system';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  getCheckoutOrderByToken,
  type CheckoutOrderLineItem
} from './checkout-orders';

let stripeClient: { key: string; client: Stripe } | null = null;

export async function isStripeConfigured() {
  return isStripeEnabled();
}

function normalizeConfigBoolean(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return null;
}

export async function isStripeEnabled() {
  const [enabledValue, secretKey] = await Promise.all([
    getPaymentConfigValue('stripeEnabled'),
    getPaymentConfigValue('stripeSecretKey')
  ]);
  const enabled = normalizeConfigBoolean(enabledValue);
  if (enabled === false) {
    return false;
  }

  return Boolean(secretKey);
}

export async function getStripeClient() {
  const stripeSecretKey = await getPaymentConfigValue('stripeSecretKey');
  if (!stripeSecretKey) {
    return null;
  }

  if (!stripeClient || stripeClient.key !== stripeSecretKey) {
    stripeClient = {
      key: stripeSecretKey,
      client: new Stripe(stripeSecretKey, {
        apiVersion: '2025-04-30.basil'
      })
    };
  }

  return stripeClient.client;
}

async function getBaseUrl() {
  const baseUrl = process.env.BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error('BASE_URL is not configured.');
  }

  return baseUrl;
}

function getStripeRecurringConfig(interval: string) {
  if (interval === 'daily') {
    return {
      interval: 'day' as const,
      intervalCount: 1
    };
  }

  if (interval === 'weekly') {
    return {
      interval: 'week' as const,
      intervalCount: 1
    };
  }

  if (interval === 'quarterly') {
    return {
      interval: 'month' as const,
      intervalCount: 3
    };
  }

  if (interval === 'semiannual') {
    return {
      interval: 'month' as const,
      intervalCount: 6
    };
  }

  if (interval === 'yearly') {
    return {
      interval: 'year' as const,
      intervalCount: 1
    };
  }

  return {
    interval: 'month' as const,
    intervalCount: 1
  };
}

function getTemplateStripeFingerprint(template: SubscriptionTemplate) {
  const fingerprintPayload = JSON.stringify({
    name: template.name,
    billingInterval: template.billingInterval,
    priceCents: template.priceCents,
    currency: template.currency.toLowerCase(),
    trialPeriodDays: template.trialPeriodDays
  });

  return createHash('sha256').update(fingerprintPayload).digest('hex').slice(0, 16);
}

function getTemplateStripePriceLookupKey(template: SubscriptionTemplate) {
  return `tpl-${template.id}-${getTemplateStripeFingerprint(template)}`;
}

async function ensureStripeProductForTemplate(
  stripe: Stripe,
  template: SubscriptionTemplate
) {
  let existingProduct: Stripe.Product | null = null;
  let startingAfter: string | undefined = undefined;

  while (!existingProduct) {
    const products: Stripe.ApiList<Stripe.Product> = await stripe.products.list({
      active: true,
      limit: 100,
      starting_after: startingAfter
    });

    existingProduct =
      products.data.find(
        (product) => product.metadata?.subscription_template_id === String(template.id)
      ) || null;

    if (existingProduct || !products.has_more || products.data.length === 0) {
      break;
    }

    startingAfter = products.data[products.data.length - 1]?.id;
  }

  if (existingProduct) {
    if (existingProduct.name !== template.name) {
      await stripe.products.update(existingProduct.id, {
        name: template.name
      });
    }

    return existingProduct.id;
  }

  const createdProduct = await stripe.products.create({
    name: template.name,
    description: `Subscription template ${template.id}`,
    metadata: {
      subscription_template_id: String(template.id)
    }
  });

  return createdProduct.id;
}

async function ensureStripePriceForTemplate(
  stripe: Stripe,
  template: SubscriptionTemplate
) {
  const lookupKey = getTemplateStripePriceLookupKey(template);

  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1
  });

  const existingPrice = prices.data[0];
  if (existingPrice) {
    return existingPrice.id;
  }

  const productId = await ensureStripeProductForTemplate(stripe, template);
  const recurring = getStripeRecurringConfig(template.billingInterval);

  // NOTE: For future bulk synchronization, we can diff this fingerprint against
  // external provider data and update prices/templates in a background job.
  const createdPrice = await stripe.prices.create({
    product: productId,
    unit_amount: template.priceCents,
    currency: template.currency.toLowerCase(),
    recurring: {
      interval: recurring.interval,
      interval_count: recurring.intervalCount
    },
    lookup_key: lookupKey,
    metadata: {
      subscription_template_id: String(template.id),
      template_fingerprint: getTemplateStripeFingerprint(template)
    }
  });

  return createdPrice.id;
}

function normalizeChangeMode(value: string | null | undefined) {
  if (value === 'immediate' || value === 'period_end') {
    return value;
  }

  return null;
}

function normalizeFutureUnixTimestamp(value: Date | null | undefined) {
  if (!value || !(value instanceof Date) || Number.isNaN(value.valueOf())) {
    return null;
  }

  const now = Date.now();
  const millis = value.getTime();
  if (millis <= now) {
    return null;
  }

  return Math.floor(millis / 1000);
}

function normalizeIdempotencyKey(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 255);
}

export async function createCheckoutSession({
  team,
  user,
  targetType,
  targetTeamId,
  targetUserId,
  template,
  changeMode,
  currentPeriodEnd,
  trialEndsAt,
  currentAssignmentId,
  currentTemplateId,
  checkoutToken,
  checkoutOrderId,
  idempotencyKey,
  cancelPath,
  trialEligible = true,
  redirectOnSuccess = true
}: {
  team: Pick<Team, 'id' | 'stripeCustomerId' | 'stripeProductId'> | null;
  user?: Pick<User, 'id'> | null;
  targetType?: 'team' | 'user' | null;
  targetTeamId?: number | null;
  targetUserId?: number | null;
  template: SubscriptionTemplate;
  changeMode?: 'immediate' | 'period_end' | null;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
  currentAssignmentId?: number | null;
  currentTemplateId?: number | null;
  checkoutToken?: string | null;
  checkoutOrderId?: number | null;
  idempotencyKey?: string | null;
  cancelPath?: string | null;
  trialEligible?: boolean;
  redirectOnSuccess?: boolean;
}) {
  const stripeEnabled = await isStripeEnabled();
  if (!stripeEnabled) {
    redirect('/pricing');
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    redirect('/pricing');
  }

  const resolvedUser = user ?? (await getUser());
  const resolvedTargetType = targetType === 'user' ? 'user' : 'team';
  const resolvedTargetTeamId =
    resolvedTargetType === 'team' ? targetTeamId ?? team?.id ?? null : null;
  const resolvedTargetUserId =
    resolvedTargetType === 'user' ? targetUserId ?? resolvedUser?.id ?? null : null;

  if (!resolvedUser || (resolvedTargetType === 'team' && !team)) {
    redirect(
      `/sign-up?redirect=checkout&templateId=${encodeURIComponent(
        String(template.id)
      )}`
    );
  }

  const templateSnapshot = createCheckoutTemplateSnapshot(template);
  const normalizedChangeMode = normalizeChangeMode(changeMode);
  const scheduledTrialEnd =
    normalizedChangeMode === 'period_end'
      ? normalizeFutureUnixTimestamp(currentPeriodEnd ?? trialEndsAt ?? null)
      : null;
  const resolvedChangeMode =
    normalizedChangeMode === 'period_end' && scheduledTrialEnd
      ? 'period_end'
      : normalizedChangeMode === 'immediate'
        ? 'immediate'
        : null;

  const subscriptionMetadata: Record<string, string> = {
    subscription_template_id: String(template.id),
    subscription_template_fingerprint: templateSnapshot.fingerprint
  };

  if (resolvedChangeMode) {
    subscriptionMetadata.checkout_change_mode = resolvedChangeMode;
  }
  if (currentAssignmentId) {
    subscriptionMetadata.checkout_current_assignment_id = String(
      currentAssignmentId
    );
  }
  if (currentTemplateId) {
    subscriptionMetadata.checkout_current_template_id = String(currentTemplateId);
  }
  if (checkoutToken) {
    subscriptionMetadata.checkout_token = checkoutToken;
  }
  if (checkoutOrderId && Number.isInteger(checkoutOrderId) && checkoutOrderId > 0) {
    subscriptionMetadata.checkout_order_id = String(checkoutOrderId);
  }

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: subscriptionMetadata
  };

  if (scheduledTrialEnd) {
    subscriptionData.trial_end = scheduledTrialEnd;
  } else if (trialEligible && template.trialPeriodDays > 0) {
    subscriptionData.trial_period_days = template.trialPeriodDays;
  }

  const priceId = await ensureStripePriceForTemplate(stripe, template);

  const baseUrl = await getBaseUrl();
  const successUrl = new URL('/api/checkout/methods/stripe/return', baseUrl);
  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  if (checkoutToken) {
    successUrl.searchParams.set('checkout_token', checkoutToken);
  }
  const resolvedCancelPath =
    cancelPath && cancelPath.startsWith('/') ? cancelPath : '/pricing';
  await emitEventAsync(
    EVENT_HOOKS.checkoutSessionCreateBefore,
    {
      provider: 'stripe',
      templateId: template.id,
      teamId: resolvedTargetTeamId,
      userId: resolvedUser.id,
      targetType: resolvedTargetType,
      targetUserId: resolvedTargetUserId,
      changeMode: resolvedChangeMode,
      checkoutOrderId: checkoutOrderId ?? null
    },
    { source: '/lib/payments/stripe' }
  );
  const resolvedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl.toString(),
      cancel_url: `${baseUrl}${resolvedCancelPath}`,
      customer:
        resolvedTargetType === 'team' ? team?.stripeCustomerId || undefined : undefined,
      client_reference_id: resolvedUser.id.toString(),
      allow_promotion_codes: true,
      metadata: subscriptionMetadata,
      subscription_data: subscriptionData
    },
    resolvedIdempotencyKey ? { idempotencyKey: resolvedIdempotencyKey } : undefined
  );

  await emitEventAsync(
    EVENT_HOOKS.checkoutSessionCreateAfter,
    {
      provider: 'stripe',
      sessionId: session.id,
      templateId: template.id,
      teamId: resolvedTargetTeamId,
      userId: resolvedUser.id,
      targetType: resolvedTargetType,
      targetUserId: resolvedTargetUserId,
      checkoutOrderId: checkoutOrderId ?? null
    },
    { source: '/lib/payments/stripe' }
  );

  if (redirectOnSuccess) {
    if (!session.url) {
      redirect('/pricing');
    }

    redirect(session.url);
  }

  return {
    id: session.id,
    url: session.url
  };
}

export async function createOneTimeCheckoutSession({
  team,
  user,
  targetType,
  targetTeamId,
  targetUserId,
  checkoutToken,
  checkoutOrderId,
  amount,
  currency,
  planName,
  lineItems,
  idempotencyKey,
  cancelPath,
  redirectOnSuccess = true
}: {
  team: Pick<Team, 'id' | 'stripeCustomerId'> | null;
  user?: Pick<User, 'id'> | null;
  targetType?: 'team' | 'user' | null;
  targetTeamId?: number | null;
  targetUserId?: number | null;
  checkoutToken?: string | null;
  checkoutOrderId?: number | null;
  amount: number;
  currency: string;
  planName?: string | null;
  lineItems: Array<
    Pick<
      CheckoutOrderLineItem,
      'name' | 'description' | 'quantity' | 'unitAmount' | 'totalAmount' | 'currency'
    >
  >;
  idempotencyKey?: string | null;
  cancelPath?: string | null;
  redirectOnSuccess?: boolean;
}) {
  const stripeEnabled = await isStripeEnabled();
  if (!stripeEnabled) {
    redirect('/pricing');
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    redirect('/pricing');
  }

  const resolvedUser = user ?? (await getUser());
  const resolvedTargetType = targetType === 'user' ? 'user' : 'team';
  const resolvedTargetTeamId =
    resolvedTargetType === 'team' ? targetTeamId ?? team?.id ?? null : null;
  const resolvedTargetUserId =
    resolvedTargetType === 'user' ? targetUserId ?? resolvedUser?.id ?? null : null;

  if (!resolvedUser || (resolvedTargetType === 'team' && !team)) {
    redirect('/sign-up?redirect=pricing');
  }

  const normalizedCurrency = currency.trim().toLowerCase() || 'usd';
  const normalizedLineItems =
    lineItems.length > 0
      ? lineItems
      : [
          {
            name: planName?.trim() || 'One-time payment',
            description: null,
            quantity: 1,
            unitAmount: amount,
            totalAmount: amount,
            currency: normalizedCurrency.toUpperCase()
          }
        ];

  const paymentMetadata: Record<string, string> = {
    checkout_order_type: 'one_time'
  };
  if (checkoutToken) {
    paymentMetadata.checkout_token = checkoutToken;
  }
  if (checkoutOrderId && Number.isInteger(checkoutOrderId) && checkoutOrderId > 0) {
    paymentMetadata.checkout_order_id = String(checkoutOrderId);
  }
  if (resolvedTargetType === 'team' && resolvedTargetTeamId) {
    paymentMetadata.checkout_target_type = 'team';
    paymentMetadata.checkout_target_team_id = String(resolvedTargetTeamId);
  }
  if (resolvedTargetType === 'user' && resolvedTargetUserId) {
    paymentMetadata.checkout_target_type = 'user';
    paymentMetadata.checkout_target_user_id = String(resolvedTargetUserId);
  }

  const baseUrl = await getBaseUrl();
  const successUrl = new URL('/api/checkout/methods/stripe/return', baseUrl);
  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  if (checkoutToken) {
    successUrl.searchParams.set('checkout_token', checkoutToken);
  }
  const resolvedCancelPath =
    cancelPath && cancelPath.startsWith('/') ? cancelPath : '/pricing';

  await emitEventAsync(
    EVENT_HOOKS.checkoutSessionCreateBefore,
    {
      provider: 'stripe',
      orderType: 'one_time',
      amount,
      currency: normalizedCurrency.toUpperCase(),
      teamId: resolvedTargetTeamId,
      userId: resolvedUser.id,
      targetType: resolvedTargetType,
      targetUserId: resolvedTargetUserId,
      checkoutOrderId: checkoutOrderId ?? null
    },
    { source: '/lib/payments/stripe' }
  );

  const resolvedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      line_items: normalizedLineItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: (item.currency || normalizedCurrency).toLowerCase(),
          unit_amount: item.unitAmount,
          product_data: {
            name: item.name,
            ...(item.description ? { description: item.description } : {})
          }
        }
      })),
      mode: 'payment',
      success_url: successUrl.toString(),
      cancel_url: `${baseUrl}${resolvedCancelPath}`,
      customer:
        resolvedTargetType === 'team' ? team?.stripeCustomerId || undefined : undefined,
      client_reference_id: resolvedUser.id.toString(),
      allow_promotion_codes: true,
      metadata: paymentMetadata,
      payment_intent_data: {
        metadata: paymentMetadata
      },
      submit_type: 'pay'
    },
    resolvedIdempotencyKey ? { idempotencyKey: resolvedIdempotencyKey } : undefined
  );

  await emitEventAsync(
    EVENT_HOOKS.checkoutSessionCreateAfter,
    {
      provider: 'stripe',
      sessionId: session.id,
      orderType: 'one_time',
      amount,
      currency: normalizedCurrency.toUpperCase(),
      teamId: resolvedTargetTeamId,
      userId: resolvedUser.id,
      targetType: resolvedTargetType,
      targetUserId: resolvedTargetUserId,
      checkoutOrderId: checkoutOrderId ?? null
    },
    { source: '/lib/payments/stripe' }
  );

  if (redirectOnSuccess) {
    if (!session.url) {
      redirect('/pricing');
    }

    redirect(session.url);
  }

  return {
    id: session.id,
    url: session.url
  };
}

export async function getCheckoutSessionRedirectUrl(sessionId: string) {
  const stripe = await getStripeClient();
  if (!stripe) {
    return null;
  }

  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(normalizedSessionId);
    return typeof session.url === 'string' ? session.url : null;
  } catch {
    return null;
  }
}

export async function createCustomerPortalSession(team: Team) {
  const stripe = await getStripeClient();
  if (!stripe) {
    redirect('/pricing');
  }

  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(team.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        payment_method_update: {
          enabled: true
        }
      }
    });
  }

  const baseUrl = await getBaseUrl();
  return stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const checkoutToken =
    typeof subscription.metadata?.checkout_token === 'string'
      ? subscription.metadata.checkout_token.trim()
      : null;

  const [checkoutOrder, team, teamAssignment, userAssignment] = await Promise.all([
    checkoutToken ? getCheckoutOrderByToken(checkoutToken) : Promise.resolve(null),
    customerId ? getTeamByStripeCustomerId(customerId) : Promise.resolve(null),
    getActiveTeamSubscriptionAssignmentByProviderReferenceId({
      provider: 'stripe',
      referenceId: subscriptionId
    }),
    getActiveUserSubscriptionAssignmentByProviderReferenceId({
      provider: 'stripe',
      referenceId: subscriptionId
    })
  ]);

  if (
    checkoutOrder?.targetType === 'user' &&
    typeof checkoutOrder.targetUserId === 'number'
  ) {
    return {
      handled: true,
      targetType: 'user' as const,
      targetTeamId: null,
      targetUserId: checkoutOrder.targetUserId,
      subscriptionStatus: status
    };
  }

  if (typeof userAssignment?.targetUserId === 'number') {
    return {
      handled: true,
      targetType: 'user' as const,
      targetTeamId: null,
      targetUserId: userAssignment.targetUserId,
      subscriptionStatus: status
    };
  }

  const resolvedTeamId =
    checkoutOrder?.targetType === 'team'
      ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
      : team?.id ?? teamAssignment?.targetTeamId ?? null;

  if (!resolvedTeamId) {
    console.error('Checkout target not found for Stripe subscription:', subscriptionId);
    return {
      handled: false,
      targetType: null,
      targetTeamId: null,
      targetUserId: null,
      subscriptionStatus: status
    };
  }

  return {
    handled: true,
    targetType: 'team' as const,
    targetTeamId: resolvedTeamId,
    targetUserId: null,
    subscriptionStatus: status
  };
}

export async function getStripePrices() {
  const stripe = await getStripeClient();
  if (!stripe) {
    return [];
  }

  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  const stripe = await getStripeClient();
  if (!stripe) {
    return [];
  }

  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}
