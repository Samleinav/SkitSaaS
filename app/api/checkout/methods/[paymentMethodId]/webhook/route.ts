import { NextResponse } from 'next/server';
import { executeCheckoutPaymentMethodAction } from '@/lib/payments/payment-methods';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

function getFallbackCheckoutToken(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const tokenFromQuery =
    searchParams.get('checkoutToken') ||
    searchParams.get('checkout_token');
  if (tokenFromQuery) {
    return tokenFromQuery.trim();
  }

  return null;
}

export const POST = withApiRouteEntries(
  CoreApiRoutes.checkout.webhook.handler(async (request: Request, params) => {
    const paymentMethodId = params.paymentMethodId?.trim();
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'paymentMethodId is required.' }, { status: 400 });
    }

    const result = await executeCheckoutPaymentMethodAction({
      paymentMethodId,
      action: 'webhook',
      request,
      fallbackCheckoutToken: getFallbackCheckoutToken(request),
      source: 'webhook'
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    return NextResponse.json({
      ok: true,
      result: result.result,
      checkoutOrder: result.checkoutOrder
        ? {
            id: result.checkoutOrder.id,
            checkoutToken: result.checkoutOrder.checkoutToken,
            status: result.checkoutOrder.status
          }
        : null
    });
  })
);
