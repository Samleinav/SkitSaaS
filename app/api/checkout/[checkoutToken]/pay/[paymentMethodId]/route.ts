import { NextResponse } from 'next/server';
import { getTeamById, getUser } from '@/lib/db/queries';
import { getCheckoutOrderByTokenForUser } from '@/lib/payments/checkout-orders';
import { startCheckoutPaymentByMethod } from '@/lib/payments/payment-methods';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

export const POST = withApiRouteEntries(
  CoreApiRoutes.checkout.pay.handler(async (request: Request, params) => {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.', redirectUrl: '/login?redirect=pricing' },
        { status: 401 }
      );
    }

    const checkoutToken = params.checkoutToken?.trim();
    const paymentMethodId = params.paymentMethodId?.trim();
    if (!checkoutToken || !paymentMethodId) {
      return NextResponse.json(
        { error: 'checkoutToken and paymentMethodId are required.' },
        { status: 400 }
      );
    }

    const checkoutAccess = await getCheckoutOrderByTokenForUser({
      checkoutToken,
      userId: user.id
    });
    if (!checkoutAccess) {
      return NextResponse.json({ error: 'Checkout order not found.' }, { status: 404 });
    }
    const checkoutOrder = checkoutAccess.checkoutOrder;

    let teamContext: {
      id: number;
      name: string;
      stripeCustomerId: string | null;
      stripeProductId: string | null;
    } | null = null;

    if (checkoutOrder.targetType === 'team') {
      if (checkoutAccess.teamRole !== 'owner') {
        return NextResponse.json(
          { error: 'Only owners can start team checkout.' },
          { status: 403 }
        );
      }

      const scopedTeamId = checkoutOrder.targetTeamId ?? checkoutOrder.teamId;
      if (!scopedTeamId) {
        return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
      }

      const team = await getTeamById(scopedTeamId);
      if (!team) {
        return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
      }

      teamContext = {
        id: team.id,
        name: team.name,
        stripeCustomerId: team.stripeCustomerId,
        stripeProductId: team.stripeProductId
      };
    }

    const result = await startCheckoutPaymentByMethod({
      paymentMethodId,
      checkoutOrder,
      request,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      team: teamContext
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    return NextResponse.json(result);
  })
);
