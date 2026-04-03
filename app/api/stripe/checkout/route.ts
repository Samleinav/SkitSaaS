import { NextResponse } from 'next/server';
import { executeStripeCheckoutReturnAction } from '@/lib/payments/core-return-actions';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

function resolveRedirectTarget(request: Request, redirectUrl: string) {
  try {
    return new URL(redirectUrl, request.url);
  } catch {
    return null;
  }
}

async function handleStripeCheckout(request: Request): Promise<Response> {
  await logLegacyCheckoutRouteUsage({
    request,
    routePath: '/api/stripe/checkout',
    replacementPath: '/api/checkout/methods/stripe/return',
    provider: 'stripe',
    source: '/api/stripe/checkout'
  });

  const result = await executeStripeCheckoutReturnAction({
    request,
    fallbackCheckoutToken:
      new URL(request.url).searchParams.get('checkout_token')?.trim() ?? null,
    source: '/api/stripe/checkout'
  });

  const redirectUrl = result.ok
    ? result.result.redirectUrl ?? '/dashboard'
    : result.redirectUrl ?? '/error';
  const target = resolveRedirectTarget(request, redirectUrl);

  return NextResponse.redirect(target ?? new URL('/error', request.url));
}

export const GET = withApiRouteEntries(
  CoreApiRoutes.stripe.checkout.handler(handleStripeCheckout)
);
