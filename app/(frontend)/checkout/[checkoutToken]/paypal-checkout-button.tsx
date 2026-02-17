'use client';

import { loadScript } from '@paypal/paypal-js';
import { useEffect, useRef, useState } from 'react';
import { useAreaMessages } from '@/lib/i18n/client';

type PayPalCheckoutButtonProps = {
  clientId: string;
  checkoutToken: string;
  currency: string;
};

type CheckoutResponse = {
  error?: string;
  redirectUrl?: string;
};

type StartPaymentResponse = {
  ok?: boolean;
  error?: string;
  clientPayload?: {
    planId?: string;
    [key: string]: unknown;
  } | null;
  redirectUrl?: string;
};

export function PayPalCheckoutButton({
  clientId,
  checkoutToken,
  currency
}: PayPalCheckoutButtonProps) {
  const messages = useAreaMessages('global');
  const paypalMessages = messages.paypal;
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isUnmounted = false;
    let closeButtons: (() => Promise<void>) | null = null;

    async function renderButtons() {
      if (!containerRef.current) {
        return;
      }

      try {
        const paypalClient = await loadScript({
          clientId,
          currency,
          intent: 'subscription',
          vault: true,
          components: ['buttons']
        });

        if (isUnmounted || !paypalClient?.Buttons || !containerRef.current) {
          return;
        }

        const buttons = paypalClient.Buttons({
          style: {
            color: 'blue',
            label: 'subscribe',
            layout: 'vertical',
            shape: 'pill'
          },
          onClick: async (_, actions) => {
            const currentUserResponse = await fetch('/api/user', {
              cache: 'no-store'
            });
            const currentUser = await currentUserResponse.json();

            if (!currentUser) {
              window.location.href = '/login?redirect=pricing';
              return actions.reject();
            }

            setError(null);
            return actions.resolve();
          },
          createSubscription: async (_, actions) => {
            const paymentStartResponse = await fetch(
              `/api/checkout/${encodeURIComponent(checkoutToken)}/pay/paypal`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );

            const paymentStartBody = (await paymentStartResponse
              .json()
              .catch(() => ({}))) as StartPaymentResponse;
            const planId =
              typeof paymentStartBody.clientPayload?.planId === 'string'
                ? paymentStartBody.clientPayload.planId
                : '';

            if (
              !paymentStartResponse.ok ||
              !paymentStartBody.ok ||
              !planId
            ) {
              if (
                paymentStartResponse.status === 401 &&
                paymentStartBody.redirectUrl
              ) {
                window.location.href = paymentStartBody.redirectUrl;
                return Promise.reject(new Error('Unauthorized'));
              }

              setError(paymentStartBody.error || paypalMessages.unableToConfirm);
              return Promise.reject(new Error('Plan not available'));
            }

            return actions.subscription.create({
              plan_id: planId
            });
          },
          onApprove: async (data) => {
            if (!data.subscriptionID) {
              setError(paypalMessages.missingSubscriptionId);
              return;
            }

            const response = await fetch('/api/checkout/methods/paypal/return', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                subscriptionId: data.subscriptionID,
                checkoutToken
              })
            });

            const body = (await response.json().catch(() => ({}))) as CheckoutResponse;

            if (!response.ok) {
              if (response.status === 401 && body.redirectUrl) {
                window.location.href = body.redirectUrl;
                return;
              }

              setError(body.error || paypalMessages.unableToConfirm);
              return;
            }

            window.location.href = body.redirectUrl || '/dashboard';
          },
          onCancel: async () => {
            await fetch(
              `/api/checkout/methods/paypal/cancel?checkoutToken=${encodeURIComponent(checkoutToken)}`,
              {
                method: 'POST'
              }
            ).catch(() => null);
            setError(paypalMessages.canceled);
            window.location.reload();
          },
          onError: () => {
            setError(paypalMessages.failed);
          }
        });

        if (!buttons.isEligible()) {
          setError(paypalMessages.unavailable);
          return;
        }

        closeButtons = buttons.close;
        await buttons.render(containerRef.current);
      } catch {
        if (!isUnmounted) {
          setError(paypalMessages.unableToLoad);
        }
      }
    }

    void renderButtons();

    return () => {
      isUnmounted = true;
      if (closeButtons) {
        void closeButtons();
      }
    };
  }, [checkoutToken, clientId, currency, paypalMessages]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="overflow-hidden rounded-sm" />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
