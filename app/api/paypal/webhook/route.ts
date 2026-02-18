import {
  getPaymentConfigValue,
} from '@/lib/payments/config';
import { createPaymentLog } from '@/lib/payments/logs';
import {
  mapSubscriptionStatusToOrderStatus
} from '@/lib/payments/orders';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  getPayPalAccessToken,
  getPayPalApiBaseUrl,
  handlePayPalWebhookEvent,
  isPayPalConfigured,
  type PayPalWebhookEvent
} from '@/lib/payments/paypal';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { NextRequest, NextResponse } from 'next/server';
import { recordPayPalCheckoutEvent } from '@/lib/payments/checkout-system';

type VerifyWebhookResponse = {
  verification_status?: string;
};

const PAYPAL_IGNORED_WEBHOOK_EVENT_MESSAGE = 'PayPal webhook event ignored.';

export async function POST(request: NextRequest) {
  await logLegacyCheckoutRouteUsage({
    request,
    routePath: '/api/paypal/webhook',
    replacementPath: '/api/checkout/methods/paypal/webhook',
    provider: 'paypal',
    source: '/api/paypal/webhook'
  });

  if (!(await isPayPalConfigured())) {
    return NextResponse.json(
      { error: 'PayPal is not configured.' },
      { status: 503 }
    );
  }

  const payload = await request.text();
  let event: PayPalWebhookEvent;

  try {
    event = JSON.parse(payload) as PayPalWebhookEvent;
  } catch {
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookFailed,
      { provider: 'paypal', reason: 'invalid_payload' },
      { source: '/api/paypal/webhook' }
    );
    await createPaymentLog({
      provider: 'paypal',
      eventType: 'webhook.invalid_payload',
      status: 'failed',
      message: 'Invalid JSON payload.'
    });
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const webhookId = await getPaymentConfigValue('paypalWebhookId');
  if (webhookId) {
    const isValid = await verifyWebhookSignature(request, event, webhookId);
    if (!isValid) {
      await emitEventAsync(
        EVENT_HOOKS.checkoutWebhookFailed,
        {
          provider: 'paypal',
          eventType: event.event_type || null,
          eventId: request.headers.get('paypal-transmission-id'),
          reason: 'signature_verification_failed'
        },
        { source: '/api/paypal/webhook' }
      );
      await createPaymentLog({
        provider: 'paypal',
        eventType: event.event_type || 'webhook.invalid_signature',
        status: 'failed',
        externalId: event.resource?.id || null,
        message: 'Invalid PayPal webhook signature.'
      });
      return NextResponse.json(
        { error: 'Invalid PayPal webhook signature.' },
        { status: 400 }
      );
    }
  }

  await emitEventAsync(
    EVENT_HOOKS.checkoutWebhookReceived,
    {
      provider: 'paypal',
      eventType: event.event_type || null,
      eventId: request.headers.get('paypal-transmission-id')
    },
    { source: '/api/paypal/webhook' }
  );

  try {
    const result = await handlePayPalWebhookEvent(event);
    const handled = result.handled;
    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: handled
        ? mapSubscriptionStatusToOrderStatus(result.subscriptionStatus)
        : 'pending',
      logStatus: handled ? 'success' : 'failed',
      persistOrder: handled,
      eventType: event.event_type || 'webhook.event',
      source: 'webhook',
      teamId: result.teamId,
      targetType: result.teamId ? 'team' : null,
      targetTeamId: result.teamId,
      paymentMethod: 'paypal',
      planName: result.planName ?? null,
      providerPlanId: event.resource?.plan_id || null,
      externalPaymentId: event.resource?.id || null,
      message: handled
        ? 'PayPal webhook event processed.'
        : PAYPAL_IGNORED_WEBHOOK_EVENT_MESSAGE,
      metadata: {
        subscriptionStatus: result.subscriptionStatus,
        handled
      },
      providerMetadata: {
        subscriptionId: event.resource?.id || null,
        planId: event.resource?.plan_id || null,
        webhookEventId: request.headers.get('paypal-transmission-id'),
        currentPeriodStart: result.currentPeriodStart,
        currentPeriodEnd: result.currentPeriodEnd
      }
    });
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookProcessed,
      {
        provider: 'paypal',
        eventType: event.event_type || null,
        eventId: request.headers.get('paypal-transmission-id')
      },
      { source: '/api/paypal/webhook' }
    );
    return NextResponse.json({ received: true });
  } catch (error) {
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookFailed,
      {
        provider: 'paypal',
        eventType: event.event_type || null,
        eventId: request.headers.get('paypal-transmission-id'),
        reason: 'handler_error'
      },
      { source: '/api/paypal/webhook' }
    );
    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: 'pending',
      logStatus: 'failed',
      persistOrder: false,
      eventType: event.event_type || 'webhook.event',
      source: 'webhook',
      externalPaymentId: event.resource?.id || null,
      metadata: {
        handled: false,
        reason: 'handler_error'
      },
      providerMetadata: {
        subscriptionId: event.resource?.id || null,
        webhookEventId: request.headers.get('paypal-transmission-id')
      },
      message: 'Error handling PayPal webhook event.'
    });
    console.error('Error handling PayPal webhook event:', error);
    return NextResponse.json({ error: 'Webhook handling failed.' }, { status: 500 });
  }
}

async function verifyWebhookSignature(
  request: NextRequest,
  event: PayPalWebhookEvent,
  webhookId: string
) {
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    return false;
  }

  const verificationResponse = await fetch(
    `${await getPayPalApiBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auth_algo: request.headers.get('paypal-auth-algo'),
        cert_url: request.headers.get('paypal-cert-url'),
        transmission_id: request.headers.get('paypal-transmission-id'),
        transmission_sig: request.headers.get('paypal-transmission-sig'),
        transmission_time: request.headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: event
      })
    }
  );

  if (!verificationResponse.ok) {
    return false;
  }

  const verificationBody =
    (await verificationResponse.json()) as VerifyWebhookResponse;
  return verificationBody.verification_status === 'SUCCESS';
}
