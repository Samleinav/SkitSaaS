import { NextRequest, NextResponse } from 'next/server';
import { executeCheckoutPaymentMethodAction } from '@/lib/payments/payment-methods';

type RouteContext = {
  params: { paymentMethodId: string } | Promise<{ paymentMethodId: string }>;
};

function getFallbackCheckoutToken(request: NextRequest) {
  const tokenFromQuery =
    request.nextUrl.searchParams.get('checkoutToken') ||
    request.nextUrl.searchParams.get('checkout_token');
  if (tokenFromQuery) {
    return tokenFromQuery.trim();
  }

  return null;
}

function resolveRedirectTarget(request: NextRequest, redirectUrl: string) {
  try {
    return new URL(redirectUrl, request.url);
  } catch {
    return null;
  }
}

async function handleReturn(
  request: NextRequest,
  { params }: RouteContext
) {
  const resolvedParams = await Promise.resolve(params);
  const paymentMethodId = resolvedParams.paymentMethodId?.trim();
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

export const GET = handleReturn;
export const POST = handleReturn;
