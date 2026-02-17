import {
  getPayPalAccessTokenForOneTimePayments,
  getPayPalApiBaseUrlForOneTimePayments,
  getPayPalWebhookIdForOneTimePayments,
  isPayPalEnabledForOneTimePayments
} from '../config';
import type { OneTimeIntent } from '../types';

type PayPalProductSnapshot = {
  name: string;
  description: string | null;
  amount: number;
  currency: string;
};

type PayPalSessionCreateInput = {
  intent: OneTimeIntent;
  successUrl: string | null;
  cancelUrl: string | null;
};

type PayPalSessionCreateResult = {
  sessionId: string;
  checkoutUrl: string;
  providerIntentId: string | null;
  expiresAt: Date | null;
};

type PayPalWebhookEvent = Record<string, unknown>;

type PayPalWebhookSignatureVerificationResponse = {
  verification_status?: string;
};

function trimToNull(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function formatMoneyValue(amountInCents: number) {
  return (amountInCents / 100).toFixed(2);
}

function parsePayPalProductSnapshot(intent: OneTimeIntent): PayPalProductSnapshot {
  const source = intent.productSnapshot;
  const name =
    (typeof source.name === 'string' && source.name.trim()) ||
    `Product ${intent.productId}`;
  const description =
    typeof source.description === 'string' && source.description.trim()
      ? source.description.trim()
      : null;

  return {
    name,
    description,
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

function getApproveUrl(responseBody: {
  links?: Array<{ href?: string; rel?: string }>;
}) {
  const links = Array.isArray(responseBody.links) ? responseBody.links : [];
  for (const link of links) {
    const rel = trimToNull(link.rel)?.toLowerCase();
    const href = trimToNull(link.href);
    if (rel === 'approve' && href) {
      return href;
    }
  }

  return null;
}

export async function createPayPalCheckoutSessionForOneTimeIntent({
  intent,
  successUrl,
  cancelUrl
}: PayPalSessionCreateInput): Promise<
  | {
      ok: true;
      value: PayPalSessionCreateResult;
    }
  | {
      ok: false;
      code: 'provider_not_configured' | 'provider_session_create_failed';
      message: string;
    }
> {
  const [enabled, accessToken, apiBaseUrl] = await Promise.all([
    isPayPalEnabledForOneTimePayments(),
    getPayPalAccessTokenForOneTimePayments(),
    getPayPalApiBaseUrlForOneTimePayments()
  ]);
  if (!enabled || !accessToken) {
    return {
      ok: false,
      code: 'provider_not_configured',
      message: 'PayPal is not configured for one-time checkout.'
    };
  }

  const productSnapshot = parsePayPalProductSnapshot(intent);
  const redirects = resolveRedirectUrls({ successUrl, cancelUrl });
  const requestId =
    intent.idempotencyKey || `otp-paypal-order-${intent.intentKey.slice(0, 40)}`;

  try {
    const response = await fetch(`${apiBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: intent.intentKey.slice(0, 127),
            custom_id: `one_time_intent:${intent.id}`,
            invoice_id: intent.intentKey.slice(0, 127),
            description: productSnapshot.description || productSnapshot.name,
            amount: {
              currency_code: productSnapshot.currency.toUpperCase(),
              value: formatMoneyValue(productSnapshot.amount)
            }
          }
        ],
        application_context: {
          return_url: redirects.successUrl,
          cancel_url: redirects.cancelUrl,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING'
        }
      })
    });
    if (!response.ok) {
      return {
        ok: false,
        code: 'provider_session_create_failed',
        message: 'Unable to create PayPal checkout order.'
      };
    }

    const body = (await response.json().catch(() => null)) as
      | {
          id?: string;
          links?: Array<{ href?: string; rel?: string }>;
        }
      | null;
    const orderId = trimToNull(body?.id);
    const approveUrl = getApproveUrl({
      links: body?.links
    });
    if (!orderId || !approveUrl) {
      return {
        ok: false,
        code: 'provider_session_create_failed',
        message: 'PayPal checkout order response is missing id or approve URL.'
      };
    }

    return {
      ok: true,
      value: {
        sessionId: orderId,
        checkoutUrl: approveUrl,
        providerIntentId: orderId,
        expiresAt: null
      }
    };
  } catch {
    return {
      ok: false,
      code: 'provider_session_create_failed',
      message: 'Unable to create PayPal checkout order.'
    };
  }
}

export async function verifyPayPalWebhookSignature({
  request,
  event
}: {
  request: Request;
  event: PayPalWebhookEvent;
}): Promise<
  | {
      ok: true;
    }
  | {
      ok: false;
      code: 'provider_not_configured' | 'provider_webhook_invalid_signature';
      message: string;
    }
> {
  const [enabled, accessToken, apiBaseUrl, webhookId] = await Promise.all([
    isPayPalEnabledForOneTimePayments(),
    getPayPalAccessTokenForOneTimePayments(),
    getPayPalApiBaseUrlForOneTimePayments(),
    getPayPalWebhookIdForOneTimePayments()
  ]);
  if (!enabled || !accessToken || !webhookId) {
    return {
      ok: false,
      code: 'provider_not_configured',
      message: 'PayPal webhook is not configured.'
    };
  }

  try {
    const verificationResponse = await fetch(
      `${apiBaseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auth_algo: request.headers.get('paypal-auth-algo'),
          cert_url: request.headers.get('paypal-cert-url'),
          transmission_id: request.headers.get('paypal-transmission-id'),
          transmission_sig: request.headers.get('paypal-transmission-sig'),
          transmission_time: request.headers.get('paypal-transmission-time'),
          webhook_id: webhookId,
          webhook_event: event
        })
      }
    );
    if (!verificationResponse.ok) {
      return {
        ok: false,
        code: 'provider_webhook_invalid_signature',
        message: 'Invalid PayPal webhook signature.'
      };
    }

    const verificationBody = (await verificationResponse
      .json()
      .catch(() => null)) as PayPalWebhookSignatureVerificationResponse | null;
    if (verificationBody?.verification_status !== 'SUCCESS') {
      return {
        ok: false,
        code: 'provider_webhook_invalid_signature',
        message: 'Invalid PayPal webhook signature.'
      };
    }

    return {
      ok: true
    };
  } catch {
    return {
      ok: false,
      code: 'provider_webhook_invalid_signature',
      message: 'Invalid PayPal webhook signature.'
    };
  }
}
