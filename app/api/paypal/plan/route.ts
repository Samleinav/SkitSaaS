import { NextResponse } from 'next/server';
import {
  getSelfServiceSubscriptionTemplateById,
  getTeamForUser,
  getUser
} from '@/lib/db/queries';
import { ensurePayPalPlanForTemplate, isPayPalConfigured } from '@/lib/payments/paypal';
import {
  getCheckoutOrderByTokenForTeam,
  isCheckoutOrderPayable
} from '@/lib/payments/checkout-orders';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { startCheckoutPaymentByMethod } from '@/lib/payments/payment-methods';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

type PlanRequestBody = {
  templateId?: unknown;
  checkoutToken?: unknown;
};

export const POST = withApiRouteEntries(
  CoreApiRoutes.paypal.plan.handler(async (request: Request) => {
    await logLegacyCheckoutRouteUsage({
      request,
      routePath: '/api/paypal/plan',
      replacementPath: '/api/checkout/{checkoutToken}/pay/paypal',
      provider: 'paypal',
      source: '/api/paypal/plan'
    });

    if (!(await isPayPalConfigured())) {
      return NextResponse.json(
        { error: 'PayPal is not configured.' },
        { status: 503 }
      );
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.', redirectUrl: '/login?redirect=pricing' },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as PlanRequestBody;
    let template = null;
    const checkoutToken =
      typeof body.checkoutToken === 'string' ? body.checkoutToken.trim() : '';

    if (checkoutToken) {
      const team = await getTeamForUser();
      if (!team) {
        return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
      }

      const membership = team.teamMembers.find(
        (member) => member.userId === user.id
      );
      if (!membership || membership.role !== 'owner') {
        return NextResponse.json(
          { error: 'Only owners can start checkout.' },
          { status: 403 }
        );
      }

      const checkoutOrder = await getCheckoutOrderByTokenForTeam({
        checkoutToken,
        teamId: team.id
      });
      if (!checkoutOrder || !isCheckoutOrderPayable(checkoutOrder)) {
        return NextResponse.json(
          { error: 'Checkout order is not available.' },
          { status: 404 }
        );
      }

      if (
        checkoutOrder.orderType !== 'subscription' ||
        !checkoutOrder.subscriptionTemplateId
      ) {
        return NextResponse.json(
          { error: 'Checkout order is not a subscription.' },
          { status: 400 }
        );
      }

      const startResult = await startCheckoutPaymentByMethod({
        paymentMethodId: 'paypal',
        checkoutOrder,
        request,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        team: {
          id: team.id,
          name: team.name,
          stripeCustomerId: team.stripeCustomerId,
          stripeProductId: team.stripeProductId
        }
      });
      if (!startResult.ok) {
        return NextResponse.json(
          { error: startResult.error },
          { status: startResult.statusCode }
        );
      }

      const planId =
        typeof startResult.clientPayload?.planId === 'string'
          ? startResult.clientPayload.planId
          : '';
      if (!planId) {
        return NextResponse.json(
          { error: 'Unable to prepare PayPal plan.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ planId });
    } else {
      const templateId = Number(body.templateId);
      if (!Number.isInteger(templateId) || templateId <= 0) {
        return NextResponse.json(
          { error: 'templateId or checkoutToken is required.' },
          { status: 400 }
        );
      }

      template = await getSelfServiceSubscriptionTemplateById(templateId);
    }

    if (!template) {
      return NextResponse.json(
        { error: 'Subscription template not found.' },
        { status: 404 }
      );
    }

    try {
      const plan = await ensurePayPalPlanForTemplate(template);
      return NextResponse.json({ planId: plan.planId });
    } catch (error) {
      console.error('Error ensuring PayPal plan:', error);
      return NextResponse.json(
        { error: 'Unable to prepare PayPal plan.' },
        { status: 500 }
      );
    }
  })
);
