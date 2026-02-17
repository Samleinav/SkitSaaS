import Stripe from 'stripe';
import {
  getStripeClient,
  handleSubscriptionChange
} from '@/lib/payments/stripe';
import { getPaymentConfigValue } from '@/lib/payments/config';
import { createPaymentLog } from '@/lib/payments/logs';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import {
  mapSubscriptionStatusToOrderStatus
} from '@/lib/payments/orders';
import { NextRequest, NextResponse } from 'next/server';
import { recordStripeCheckoutEvent } from '@/lib/payments/checkout-system';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';

function toIsoDateFromUnix(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds)) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

export async function POST(request: NextRequest) {
  await logLegacyCheckoutRouteUsage({
    request,
    routePath: '/api/stripe/webhook',
    replacementPath: '/api/checkout/methods/stripe/webhook',
    provider: 'stripe',
    source: '/api/stripe/webhook'
  });

  const [stripe, webhookSecret] = await Promise.all([
    getStripeClient(),
    getPaymentConfigValue('stripeWebhookSecret')
  ]);

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured.' },
      { status: 503 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookFailed,
      {
        provider: 'stripe',
        reason: 'signature_verification_failed'
      },
      { source: '/api/stripe/webhook' }
    );
    await createPaymentLog({
      provider: 'stripe',
      eventType: 'webhook.signature_failed',
      status: 'failed',
      message: 'Webhook signature verification failed.',
      payload: {
        hasSignatureHeader: Boolean(signature)
      }
    });
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  await emitEventAsync(
    EVENT_HOOKS.checkoutWebhookReceived,
    { provider: 'stripe', eventType: event.type, eventId: event.id },
    { source: '/api/stripe/webhook' }
  );

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        const result = await handleSubscriptionChange(subscription);
        const firstItem = subscription.items.data[0];
        const price = firstItem?.price;
        const currentPeriodStart = toIsoDateFromUnix(
          firstItem?.current_period_start
        );
        const currentPeriodEnd = toIsoDateFromUnix(
          firstItem?.current_period_end
        );
        const trialEndsAt = toIsoDateFromUnix(subscription.trial_end ?? null);
        const canceledAt = toIsoDateFromUnix(subscription.canceled_at ?? null);
        await recordStripeCheckoutEvent({
          orderType: 'subscription',
          status: result.handled
            ? mapSubscriptionStatusToOrderStatus(result.subscriptionStatus)
            : 'failed',
          logStatus: result.handled ? 'success' : 'failed',
          eventType: event.type,
          source: 'webhook',
          teamId: result.teamId,
          targetType: result.teamId ? 'team' : null,
          targetTeamId: result.teamId,
          paymentMethod: 'card',
          planName: price?.nickname || null,
          providerPlanId: price?.id || null,
          externalOrderId: event.id,
          externalPaymentId: subscription.id,
          externalLogId: event.id,
          amount: price?.unit_amount,
          currency: price?.currency || null,
          message: result.handled
            ? 'Stripe subscription event processed.'
            : 'Stripe subscription event ignored.',
          metadata: {
            subscriptionStatus: result.subscriptionStatus
          },
          providerMetadata: {
            subscriptionId: subscription.id,
            webhookEventId: event.id,
            currentPeriodStart,
            currentPeriodEnd,
            trialEndsAt,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
            canceledAt
          }
        });
        break;
      default:
        await createPaymentLog({
          provider: 'stripe',
          eventType: event.type,
          status: 'info',
          externalId: event.id,
          message: `Unhandled event type ${event.type}`
        });
        console.log(`Unhandled event type ${event.type}`);
    }

    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookProcessed,
      { provider: 'stripe', eventType: event.type, eventId: event.id },
      { source: '/api/stripe/webhook' }
    );
  } catch (error) {
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookFailed,
      {
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        reason: 'handler_error'
      },
      { source: '/api/stripe/webhook' }
    );
    throw error;
  }

  return NextResponse.json({ received: true });
}
