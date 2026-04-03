import { NextResponse } from 'next/server';
import { executeStripeCheckoutWebhookAction } from '@/lib/payments/core-webhook-actions';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

async function handleStripeWebhook(request: Request): Promise<Response> {
  await logLegacyCheckoutRouteUsage({
    request,
    routePath: '/api/stripe/webhook',
    replacementPath: '/api/checkout/methods/stripe/webhook',
    provider: 'stripe',
    source: '/api/stripe/webhook'
  });

  const result = await executeStripeCheckoutWebhookAction({
    request,
    source: '/api/stripe/webhook'
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return NextResponse.json({ received: true });
}

export const POST = withApiRouteEntries(
  CoreApiRoutes.stripe.webhook.handler(handleStripeWebhook)
);
