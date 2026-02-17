import Stripe from 'stripe';
import type { OneTimeIntent } from '../types';
import {
  getStripeSecretKeyForOneTimePayments,
  getStripeWebhookSecretForOneTimePayments
} from '../config';

type StripeProductSnapshot = {
  name: string;
  description: string | null;
  quantity: number;
  unitAmountCents: number;
  amount: number;
  currency: string;
};

type StripeSessionCreateInput = {
  intent: OneTimeIntent;
  successUrl: string | null;
  cancelUrl: string | null;
  customerEmail: string | null;
};

type StripeSessionCreateResult = {
  sessionId: string;
  checkoutUrl: string;
  providerIntentId: string | null;
  expiresAt: Date | null;
};

let stripeClientCache: { key: string; client: Stripe } | null = null;

function trimToNull(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function getStripeClient() {
  const stripeSecretKey = await getStripeSecretKeyForOneTimePayments();
  if (!stripeSecretKey) {
    return null;
  }

  if (!stripeClientCache || stripeClientCache.key !== stripeSecretKey) {
    stripeClientCache = {
      key: stripeSecretKey,
      client: new Stripe(stripeSecretKey, {
        apiVersion: '2025-04-30.basil'
      })
    };
  }

  return stripeClientCache.client;
}

function parseStripeProductSnapshot(intent: OneTimeIntent): StripeProductSnapshot {
  const source = intent.productSnapshot;
  const name =
    (typeof source.name === 'string' && source.name.trim()) ||
    `Product ${intent.productId}`;
  const description =
    typeof source.description === 'string' && source.description.trim()
      ? source.description.trim()
      : null;
  const quantityRaw =
    typeof source.quantity === 'number'
      ? source.quantity
      : typeof source.quantity === 'string'
        ? Number(source.quantity)
        : 1;
  const quantity =
    Number.isInteger(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;

  const unitAmountRaw =
    typeof source.unitAmountCents === 'number'
      ? source.unitAmountCents
      : typeof source.unitAmountCents === 'string'
        ? Number(source.unitAmountCents)
        : intent.amount;
  const unitAmountCents =
    Number.isInteger(unitAmountRaw) && unitAmountRaw >= 0
      ? unitAmountRaw
      : intent.amount;

  return {
    name,
    description,
    quantity,
    unitAmountCents,
    amount: intent.amount,
    currency: intent.currency
  };
}

function resolveRedirectUrls({
  successUrl,
  cancelUrl
}: {
  successUrl: string | null;
  cancelUrl: string | null;
}) {
  const baseUrl = trimToNull(process.env.BASE_URL)?.replace(/\/$/, '') ?? null;
  return {
    successUrl:
      trimToNull(successUrl) ||
      (baseUrl
        ? `${baseUrl}/dashboard?checkout=one_time_success`
        : 'http://localhost:3000/dashboard?checkout=one_time_success'),
    cancelUrl:
      trimToNull(cancelUrl) ||
      (baseUrl
        ? `${baseUrl}/pricing?checkout=one_time_canceled`
        : 'http://localhost:3000/pricing?checkout=one_time_canceled')
  };
}

export async function createStripeCheckoutSessionForOneTimeIntent({
  intent,
  successUrl,
  cancelUrl,
  customerEmail
}: StripeSessionCreateInput): Promise<
  | {
      ok: true;
      value: StripeSessionCreateResult;
    }
  | {
      ok: false;
      code: 'provider_not_configured' | 'provider_session_create_failed';
      message: string;
    }
> {
  const stripe = await getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      code: 'provider_not_configured',
      message: 'Stripe is not configured for one-time checkout.'
    };
  }

  const productSnapshot = parseStripeProductSnapshot(intent);
  const redirects = resolveRedirectUrls({ successUrl, cancelUrl });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: redirects.successUrl,
      cancel_url: redirects.cancelUrl,
      customer_email: trimToNull(customerEmail) || undefined,
      line_items: [
        {
          quantity: productSnapshot.quantity,
          price_data: {
            currency: productSnapshot.currency.toLowerCase(),
            unit_amount: productSnapshot.unitAmountCents,
            product_data: {
              name: productSnapshot.name,
              description: productSnapshot.description || undefined
            }
          }
        }
      ],
      metadata: {
        one_time_intent_id: String(intent.id),
        one_time_intent_key: intent.intentKey,
        module_id: 'mod.commerce.one-time-payments'
      },
      payment_intent_data: {
        metadata: {
          one_time_intent_id: String(intent.id),
          one_time_intent_key: intent.intentKey,
          module_id: 'mod.commerce.one-time-payments'
        }
      }
    });

    if (!session.url) {
      return {
        ok: false,
        code: 'provider_session_create_failed',
        message: 'Stripe checkout session URL is missing.'
      };
    }

    return {
      ok: true,
      value: {
        sessionId: session.id,
        checkoutUrl: session.url,
        providerIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
        expiresAt:
          typeof session.expires_at === 'number'
            ? new Date(session.expires_at * 1000)
            : null
      }
    };
  } catch (error) {
    console.error(
      '[mod.commerce.one-time-payments] createStripeCheckoutSessionForOneTimeIntent failed',
      error
    );
    return {
      ok: false,
      code: 'provider_session_create_failed',
      message: 'Unable to create Stripe checkout session.'
    };
  }
}

export async function verifyStripeWebhookSignature({
  rawBody,
  signature
}: {
  rawBody: string;
  signature: string | null;
}): Promise<
  | { ok: true; event: Stripe.Event }
  | { ok: false; code: 'provider_not_configured' | 'provider_webhook_invalid_signature'; message: string }
> {
  const stripe = await getStripeClient();
  const webhookSecret = await getStripeWebhookSecretForOneTimePayments();
  if (!stripe || !webhookSecret) {
    return {
      ok: false,
      code: 'provider_not_configured',
      message: 'Stripe webhook is not configured.'
    };
  }

  if (!signature) {
    return {
      ok: false,
      code: 'provider_webhook_invalid_signature',
      message: 'Missing Stripe signature header.'
    };
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    return {
      ok: true,
      event
    };
  } catch {
    return {
      ok: false,
      code: 'provider_webhook_invalid_signature',
      message: 'Invalid Stripe webhook signature.'
    };
  }
}
