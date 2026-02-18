import { createModuleApiRouter, parseJsonBody } from '@skitsaas/sdk/server';
import {
  COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
  COMMERCE_ONE_TIME_PAYMENTS_ROUTES
} from './constants';
import {
  createPayPalCheckoutSessionForOneTimeIntent,
  verifyPayPalWebhookSignature
} from './checkout/paypal';
import {
  createStripeCheckoutSessionForOneTimeIntent,
  verifyStripeWebhookSignature
} from './checkout/stripe';
import {
  attachPayPalSessionToOneTimeIntent,
  attachStripeSessionToOneTimeIntent,
  createOneTimeCheckoutIntent,
  getOneTimeIntentByIdForActor
} from './data';
import {
  parseCreateOneTimeCheckoutIntentInput,
  parseOneTimeIntentId
} from './validators';
import { processOneTimePayPalWebhookEvent } from './webhooks/paypal';
import { processOneTimeStripeWebhookEvent } from './webhooks/stripe';

type OneTimePaymentsSessionUser = {
  id: number;
  role?: string | null;
  email?: string | null;
};

type OneTimePaymentsApiDependencies = {
  createOneTimeCheckoutIntent: typeof createOneTimeCheckoutIntent;
  getOneTimeIntentByIdForActor: typeof getOneTimeIntentByIdForActor;
  attachStripeSessionToOneTimeIntent: typeof attachStripeSessionToOneTimeIntent;
  attachPayPalSessionToOneTimeIntent: typeof attachPayPalSessionToOneTimeIntent;
  createStripeCheckoutSessionForOneTimeIntent:
    typeof createStripeCheckoutSessionForOneTimeIntent;
  createPayPalCheckoutSessionForOneTimeIntent:
    typeof createPayPalCheckoutSessionForOneTimeIntent;
  verifyStripeWebhookSignature: typeof verifyStripeWebhookSignature;
  verifyPayPalWebhookSignature: typeof verifyPayPalWebhookSignature;
  processOneTimeStripeWebhookEvent: typeof processOneTimeStripeWebhookEvent;
  processOneTimePayPalWebhookEvent: typeof processOneTimePayPalWebhookEvent;
};

const DEFAULT_API_DEPS: OneTimePaymentsApiDependencies = {
  createOneTimeCheckoutIntent,
  getOneTimeIntentByIdForActor,
  attachStripeSessionToOneTimeIntent,
  attachPayPalSessionToOneTimeIntent,
  createStripeCheckoutSessionForOneTimeIntent,
  createPayPalCheckoutSessionForOneTimeIntent,
  verifyStripeWebhookSignature,
  verifyPayPalWebhookSignature,
  processOneTimeStripeWebhookEvent,
  processOneTimePayPalWebhookEvent
};

type DispatchStartPayload = {
  checkoutOrderId: number;
  checkoutToken: string;
  intentId: number;
  actorUserId: number;
  customerEmail: string | null;
  cancelUrl: string | null;
};

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function toPositiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function appendQueryParam(url: string, key: string, value: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    return url;
  }
}

function buildCheckoutPageUrl(request: Request, checkoutToken: string) {
  try {
    const origin = new URL(request.url).origin.replace(/\/+$/, '');
    return `${origin}/checkout/${encodeURIComponent(checkoutToken)}`;
  } catch {
    return `/checkout/${encodeURIComponent(checkoutToken)}`;
  }
}

function parseDispatchStartPayload(body: unknown): DispatchStartPayload | null {
  const payload = toRecord(body);
  if (!payload) {
    return null;
  }

  const checkoutOrder = toRecord(payload.checkoutOrder);
  const actor = toRecord(payload.actor);
  const callbacks = toRecord(payload.callbacks);
  if (!checkoutOrder || !actor) {
    return null;
  }

  const checkoutOrderId = toPositiveInt(checkoutOrder.id);
  const checkoutToken = toTrimmedString(checkoutOrder.checkoutToken);
  const orderType = toTrimmedString(checkoutOrder.orderType);
  const actorUserId = toPositiveInt(actor.userId);
  const checkoutMetadata = toRecord(checkoutOrder.metadata);
  const oneTimeMetadata = checkoutMetadata
    ? toRecord(checkoutMetadata.oneTime)
    : null;
  const intentId = oneTimeMetadata ? toPositiveInt(oneTimeMetadata.intentId) : null;

  if (
    !checkoutOrderId ||
    !checkoutToken ||
    orderType !== 'one_time' ||
    !actorUserId ||
    !intentId
  ) {
    return null;
  }

  return {
    checkoutOrderId,
    checkoutToken,
    intentId,
    actorUserId,
    customerEmail: toTrimmedString(actor.userEmail),
    cancelUrl: toTrimmedString(callbacks?.cancelUrl)
  };
}

function parseDispatchCancelPayload(body: unknown) {
  const payload = toRecord(body);
  if (!payload) {
    return null;
  }

  const token =
    toTrimmedString(payload.fallbackCheckoutToken) ||
    toTrimmedString(toRecord(payload.query)?.checkoutToken) ||
    toTrimmedString(toRecord(payload.query)?.checkout_token);

  return {
    checkoutToken: token
  };
}

function jsonError(status: number, error: string, code?: string) {
  return Response.json(
    {
      ok: false,
      moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
      error,
      code: code || null
    },
    { status }
  );
}

function mapCreateIntentErrorStatus(code: string) {
  if (code === 'product_not_found' || code === 'target_team_not_found') {
    return 404;
  }

  if (code === 'target_team_forbidden') {
    return 403;
  }

  if (code === 'product_not_published' || code === 'product_missing_active_price') {
    return 409;
  }

  if (
    code === 'one_time_only_product_required' ||
    code === 'target_team_required' ||
    code === 'invalid_amount'
  ) {
    return 400;
  }

  if (code === 'provider_not_configured') {
    return 503;
  }

  if (code === 'provider_session_create_failed') {
    return 502;
  }

  return 500;
}

function mapIntentLookupErrorStatus(code: string) {
  if (code === 'not_found') {
    return 404;
  }

  if (code === 'forbidden') {
    return 403;
  }

  return 500;
}

function mapStripeWebhookVerificationErrorStatus(code: string) {
  if (code === 'provider_not_configured') {
    return 503;
  }

  if (code === 'provider_webhook_invalid_signature') {
    return 400;
  }

  return 500;
}

function mapPayPalWebhookVerificationErrorStatus(code: string) {
  if (code === 'provider_not_configured') {
    return 503;
  }

  if (code === 'provider_webhook_invalid_signature') {
    return 400;
  }

  return 500;
}

async function handleStripePaymentMethodStart({
  request,
  body,
  deps
}: {
  request: Request;
  body: unknown;
  deps: OneTimePaymentsApiDependencies;
}) {
  const dispatchPayload = parseDispatchStartPayload(body);
  if (!dispatchPayload) {
    return jsonError(
      400,
      'Invalid checkout payment-method start payload.',
      'invalid_json_body'
    );
  }

  const intentLookup = await deps.getOneTimeIntentByIdForActor(
    dispatchPayload.intentId,
    {
      userId: dispatchPayload.actorUserId
    }
  );
  if (!intentLookup.ok) {
    return jsonError(
      mapIntentLookupErrorStatus(intentLookup.code),
      intentLookup.message,
      intentLookup.code
    );
  }

  let intent = intentLookup.intent;

  if (!intent.sessionId) {
    const checkoutPageUrl = buildCheckoutPageUrl(
      request,
      dispatchPayload.checkoutToken
    );
    const cancelUrl = dispatchPayload.cancelUrl
      ? appendQueryParam(
          dispatchPayload.cancelUrl,
          'checkoutToken',
          dispatchPayload.checkoutToken
        )
      : checkoutPageUrl;
    const stripeSession = await deps.createStripeCheckoutSessionForOneTimeIntent({
      intent,
      successUrl: checkoutPageUrl,
      cancelUrl,
      customerEmail: dispatchPayload.customerEmail
    });
    if (!stripeSession.ok) {
      return jsonError(
        mapCreateIntentErrorStatus(stripeSession.code),
        stripeSession.message,
        stripeSession.code
      );
    }

    const attachResult = await deps.attachStripeSessionToOneTimeIntent({
      intentId: intent.id,
      sessionId: stripeSession.value.sessionId,
      checkoutUrl: stripeSession.value.checkoutUrl,
      providerIntentId: stripeSession.value.providerIntentId,
      expiresAt: stripeSession.value.expiresAt
    });
    if (!attachResult.ok) {
      return jsonError(
        mapCreateIntentErrorStatus(attachResult.code),
        attachResult.message,
        attachResult.code
      );
    }

    intent = attachResult.intent;
  }

  return Response.json({
    status: 'provider_pending',
    checkoutToken: dispatchPayload.checkoutToken,
    checkoutOrderId: dispatchPayload.checkoutOrderId,
    redirectUrl: intent.checkoutUrl ?? null,
    providerSessionId: intent.sessionId ?? null,
    providerReferenceId: intent.providerIntentId ?? null,
    externalOrderId: intent.sessionId ?? null,
    externalPaymentId: intent.providerIntentId ?? null,
    paymentMethod: 'card',
    metadata: {
      provider: 'stripe',
      oneTimeIntentId: intent.id,
      oneTimeIntentKey: intent.intentKey
    }
  });
}

async function handlePayPalPaymentMethodStart({
  request,
  body,
  deps
}: {
  request: Request;
  body: unknown;
  deps: OneTimePaymentsApiDependencies;
}) {
  const dispatchPayload = parseDispatchStartPayload(body);
  if (!dispatchPayload) {
    return jsonError(
      400,
      'Invalid checkout payment-method start payload.',
      'invalid_json_body'
    );
  }

  const intentLookup = await deps.getOneTimeIntentByIdForActor(
    dispatchPayload.intentId,
    {
      userId: dispatchPayload.actorUserId
    }
  );
  if (!intentLookup.ok) {
    return jsonError(
      mapIntentLookupErrorStatus(intentLookup.code),
      intentLookup.message,
      intentLookup.code
    );
  }

  let intent = intentLookup.intent;

  if (!intent.sessionId) {
    const checkoutPageUrl = buildCheckoutPageUrl(
      request,
      dispatchPayload.checkoutToken
    );
    const cancelUrl = dispatchPayload.cancelUrl
      ? appendQueryParam(
          dispatchPayload.cancelUrl,
          'checkoutToken',
          dispatchPayload.checkoutToken
        )
      : checkoutPageUrl;
    const payPalSession = await deps.createPayPalCheckoutSessionForOneTimeIntent({
      intent,
      successUrl: checkoutPageUrl,
      cancelUrl
    });
    if (!payPalSession.ok) {
      return jsonError(
        mapCreateIntentErrorStatus(payPalSession.code),
        payPalSession.message,
        payPalSession.code
      );
    }

    const attachResult = await deps.attachPayPalSessionToOneTimeIntent({
      intentId: intent.id,
      sessionId: payPalSession.value.sessionId,
      checkoutUrl: payPalSession.value.checkoutUrl,
      providerIntentId: payPalSession.value.providerIntentId,
      expiresAt: payPalSession.value.expiresAt
    });
    if (!attachResult.ok) {
      return jsonError(
        mapCreateIntentErrorStatus(attachResult.code),
        attachResult.message,
        attachResult.code
      );
    }

    intent = attachResult.intent;
  }

  return Response.json({
    status: 'provider_pending',
    checkoutToken: dispatchPayload.checkoutToken,
    checkoutOrderId: dispatchPayload.checkoutOrderId,
    redirectUrl: intent.checkoutUrl ?? null,
    providerSessionId: intent.sessionId ?? null,
    providerReferenceId: intent.providerIntentId ?? null,
    externalOrderId: intent.sessionId ?? null,
    externalPaymentId: intent.providerIntentId ?? null,
    paymentMethod: 'paypal',
    metadata: {
      provider: 'paypal',
      oneTimeIntentId: intent.id,
      oneTimeIntentKey: intent.intentKey
    }
  });
}

function handlePaymentMethodCancel(body: unknown) {
  const parsedPayload = parseDispatchCancelPayload(body);
  const checkoutToken = parsedPayload?.checkoutToken ?? null;
  const redirectUrl = checkoutToken
    ? `/checkout/${encodeURIComponent(checkoutToken)}`
    : '/dashboard';

  return Response.json({
    status: 'canceled',
    checkoutToken,
    redirectUrl,
    message: 'One-time checkout payment canceled.'
  });
}

export function createCommerceOneTimePaymentsApiHandler(
  deps: Partial<OneTimePaymentsApiDependencies> = {}
) {
  const resolvedDeps = {
    ...DEFAULT_API_DEPS,
    ...deps
  } satisfies OneTimePaymentsApiDependencies;

  return createModuleApiRouter<OneTimePaymentsSessionUser>({
  routes: [
    {
      method: 'GET',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.health,
      handler: () => {
        return Response.json({
          ok: true,
          moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
          service: 'one_time_payments',
          status: 'ready_for_backend_implementation'
        });
      }
    },
    {
      method: 'POST',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.checkoutSessions,
      auth: 'user',
      handler: async ({ request, user }) => {
        const body = await parseJsonBody(request);
        if (!body) {
          return jsonError(400, 'Invalid JSON body.', 'invalid_json_body');
        }

        const parsedInput = parseCreateOneTimeCheckoutIntentInput(body);
        if (!parsedInput.ok) {
          return jsonError(400, parsedInput.message, parsedInput.code);
        }

        const result = await resolvedDeps.createOneTimeCheckoutIntent(parsedInput.value, {
          userId: user?.id ?? 0
        });
        if (!result.ok) {
          return jsonError(
            mapCreateIntentErrorStatus(result.code),
            result.message,
            result.code
          );
        }

        let intent = result.intent;
        const hasCoreCheckoutUrl =
          typeof intent.checkoutUrl === 'string' &&
          intent.checkoutUrl.trim().startsWith('/checkout/');
        const useCoreCheckout =
          parsedInput.value.checkoutMode === 'core_checkout' || hasCoreCheckoutUrl;

        if (!useCoreCheckout && !intent.sessionId) {
          if (intent.provider === 'paypal') {
            const payPalSession =
              await resolvedDeps.createPayPalCheckoutSessionForOneTimeIntent({
                intent,
                successUrl: parsedInput.value.successUrl,
                cancelUrl: parsedInput.value.cancelUrl
              });
            if (!payPalSession.ok) {
              return jsonError(
                mapCreateIntentErrorStatus(payPalSession.code),
                payPalSession.message,
                payPalSession.code
              );
            }

            const updatedIntent = await resolvedDeps.attachPayPalSessionToOneTimeIntent({
              intentId: intent.id,
              sessionId: payPalSession.value.sessionId,
              checkoutUrl: payPalSession.value.checkoutUrl,
              providerIntentId: payPalSession.value.providerIntentId,
              expiresAt: payPalSession.value.expiresAt
            });
            if (!updatedIntent.ok) {
              return jsonError(
                mapCreateIntentErrorStatus(updatedIntent.code),
                updatedIntent.message,
                updatedIntent.code
              );
            }

            intent = updatedIntent.intent;
          } else {
            const stripeSession =
              await resolvedDeps.createStripeCheckoutSessionForOneTimeIntent({
                intent,
                successUrl: parsedInput.value.successUrl,
                cancelUrl: parsedInput.value.cancelUrl,
                customerEmail:
                  typeof user?.email === 'string' ? user.email : null
              });
            if (!stripeSession.ok) {
              return jsonError(
                mapCreateIntentErrorStatus(stripeSession.code),
                stripeSession.message,
                stripeSession.code
              );
            }

            const updatedIntent = await resolvedDeps.attachStripeSessionToOneTimeIntent({
              intentId: intent.id,
              sessionId: stripeSession.value.sessionId,
              checkoutUrl: stripeSession.value.checkoutUrl,
              providerIntentId: stripeSession.value.providerIntentId,
              expiresAt: stripeSession.value.expiresAt
            });
            if (!updatedIntent.ok) {
              return jsonError(
                mapCreateIntentErrorStatus(updatedIntent.code),
                updatedIntent.message,
                updatedIntent.code
              );
            }

            intent = updatedIntent.intent;
          }
        }

        return Response.json(
          {
            ok: true,
            moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
            idempotencyReused: result.idempotencyReused,
            intent
          },
          { status: result.idempotencyReused ? 200 : 201 }
        );
      }
    },
    {
      method: 'POST',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.paymentMethodStripeStart,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request);
        return handleStripePaymentMethodStart({
          request,
          body,
          deps: resolvedDeps
        });
      }
    },
    {
      method: 'POST',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.paymentMethodStripeCancel,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request);
        return handlePaymentMethodCancel(body);
      }
    },
    {
      method: 'POST',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.paymentMethodPayPalStart,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request);
        return handlePayPalPaymentMethodStart({
          request,
          body,
          deps: resolvedDeps
        });
      }
    },
    {
      method: 'POST',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.paymentMethodPayPalCancel,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request);
        return handlePaymentMethodCancel(body);
      }
    },
    {
      method: 'GET',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.intentById,
      auth: 'user',
      handler: async ({ params, user }) => {
        const intentId = parseOneTimeIntentId(params.intentId);
        if (!intentId.ok) {
          return jsonError(400, intentId.message, intentId.code);
        }

        const result = await resolvedDeps.getOneTimeIntentByIdForActor(intentId.value, {
          userId: user?.id ?? 0
        });
        if (!result.ok) {
          return jsonError(
            mapIntentLookupErrorStatus(result.code),
            result.message,
            result.code
          );
        }

        return Response.json({
          ok: true,
          moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
          intent: result.intent,
          fulfillment: result.fulfillment
        });
      }
    },
    {
      method: 'POST',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.webhookStripe,
      handler: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get('stripe-signature');
        const verification = await resolvedDeps.verifyStripeWebhookSignature({
          rawBody,
          signature
        });
        if (!verification.ok) {
          return jsonError(
            mapStripeWebhookVerificationErrorStatus(verification.code),
            verification.message,
            verification.code
          );
        }

        try {
          const result = await resolvedDeps.processOneTimeStripeWebhookEvent(
            verification.event
          );
          return Response.json({
            ok: true,
            moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
            handled: result.handled,
            duplicate: result.duplicate,
            status: result.status,
            intentId: result.intentId,
            message: result.message
          });
        } catch (error) {
          console.error(
            '[mod.commerce.one-time-payments] Stripe webhook processing failed',
            error
          );
          return jsonError(
            500,
            'Unable to process Stripe webhook event.',
            'operation_failed'
          );
        }
      }
    },
    {
      method: 'POST',
      path: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.webhookPayPal,
      handler: async ({ request }) => {
        const rawBody = await request.text();
        let event: Record<string, unknown>;

        try {
          event = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return jsonError(400, 'Invalid PayPal webhook payload.', 'invalid_json_body');
        }

        const verification = await resolvedDeps.verifyPayPalWebhookSignature({
          request,
          event
        });
        if (!verification.ok) {
          return jsonError(
            mapPayPalWebhookVerificationErrorStatus(verification.code),
            verification.message,
            verification.code
          );
        }

        try {
          const result = await resolvedDeps.processOneTimePayPalWebhookEvent(event);
          return Response.json({
            ok: true,
            moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
            handled: result.handled,
            duplicate: result.duplicate,
            status: result.status,
            intentId: result.intentId,
            message: result.message
          });
        } catch (error) {
          console.error(
            '[mod.commerce.one-time-payments] PayPal webhook processing failed',
            error
          );
          return jsonError(
            500,
            'Unable to process PayPal webhook event.',
            'operation_failed'
          );
        }
      }
    }
  ]
  });
}

export const commerceOneTimePaymentsApiHandler =
  createCommerceOneTimePaymentsApiHandler();
