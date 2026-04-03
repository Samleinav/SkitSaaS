import { NextResponse } from 'next/server';
import { executePayPalCheckoutWebhookAction } from '@/lib/payments/core-webhook-actions';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

async function handlePayPalWebhook(request: Request): Promise<Response> {
  await logLegacyCheckoutRouteUsage({
    request,
    routePath: '/api/paypal/webhook',
    replacementPath: '/api/checkout/methods/paypal/webhook',
    provider: 'paypal',
    source: '/api/paypal/webhook'
  });

  const result = await executePayPalCheckoutWebhookAction({
    request,
    source: '/api/paypal/webhook'
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return NextResponse.json({ received: true });
}

export const POST = withApiRouteEntries(
  CoreApiRoutes.paypal.webhook.handler(handlePayPalWebhook)
);
