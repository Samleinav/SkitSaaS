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

function resolveRedirectTarget(request: Request, redirectUrl: string) {
  try {
    return new URL(redirectUrl, request.url);
  } catch {
    return null;
  }
}

async function handleReturn(request: Request, params: Record<string, string>) {
  const paymentMethodId = params.paymentMethodId?.trim();
  if (!paymentMethodId) {
    return NextResponse.json({ error: 'paymentMethodId is required.' }, { status: 400 });
  }

  const result = await executeCheckoutPaymentMethodAction({
    paymentMethodId,
    action: 'return',
    request,
    fallbackCheckoutToken: getFallbackCheckoutToken(request),
    source: 'checkout'
  });

  if (!result.ok) {
    const redirectUrl =
      'redirectUrl' in result && typeof result.redirectUrl === 'string'
        ? result.redirectUrl
        : null;
    if (redirectUrl && request.method === 'GET') {
      const target = resolveRedirectTarget(request, redirectUrl);
      if (target) {
        return NextResponse.redirect(target);
      }
    }
    return NextResponse.json(
      { error: result.error, redirectUrl },
      { status: result.statusCode }
    );
  }

  if (result.result.redirectUrl && request.method === 'GET') {
    const target = resolveRedirectTarget(request, result.result.redirectUrl);
    if (target) {
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.json({
    ok: true,
    redirectUrl: result.result.redirectUrl ?? null,
    result: result.result,
    checkoutOrder: result.checkoutOrder
      ? {
          id: result.checkoutOrder.id,
          checkoutToken: result.checkoutOrder.checkoutToken,
          status: result.checkoutOrder.status
        }
      : null
  });
}

export const GET = withApiRouteEntries(
  CoreApiRoutes.checkout.return.get.handler(handleReturn)
);
export const POST = withApiRouteEntries(
  CoreApiRoutes.checkout.return.post.handler(handleReturn)
);
