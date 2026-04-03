import { NextResponse } from 'next/server';
import { executePayPalCheckoutReturnAction } from '@/lib/payments/core-return-actions';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

export const POST = withApiRouteEntries(
  CoreApiRoutes.paypal.checkout.handler(async (request: Request) => {
    await logLegacyCheckoutRouteUsage({
      request,
      routePath: '/api/paypal/checkout',
      replacementPath: '/api/checkout/methods/paypal/return',
      provider: 'paypal',
      source: '/api/paypal/checkout'
    });

    const fallbackCheckoutToken = (() => {
      const searchParams = new URL(request.url).searchParams;
      const tokenFromQuery =
        searchParams.get('checkoutToken') || searchParams.get('checkout_token');
      return tokenFromQuery?.trim() || null;
    })();

    const result = await executePayPalCheckoutReturnAction({
      request,
      fallbackCheckoutToken,
      source: '/api/paypal/checkout'
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          redirectUrl: result.redirectUrl ?? null
        },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      ok: true,
      redirectUrl: result.result.redirectUrl ?? null,
      subscription:
        result.result.metadata &&
        typeof result.result.metadata === 'object' &&
        'subscription' in result.result.metadata
          ? result.result.metadata.subscription
          : null
    });
  })
);
