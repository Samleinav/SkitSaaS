'use client';

import { loadScript } from '@paypal/paypal-js';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/client';

type PayPalCheckoutButtonProps = {
  clientId: string;
  checkoutToken: string;
  orderType: 'subscription' | 'one_time';
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
    flow?: string;
    planId?: string;
    orderId?: string;
    customId?: string;
    providerSessionId?: string;
    [key: string]: unknown;
  } | null;
  redirectUrl?: string;
};

type PayPalClickActions = {
  resolve: () => Promise<void>;
  reject: () => Promise<void>;
};

type PayPalSubscriptionActions = {
  subscription: {
    create: (payload: {
      plan_id: string;
      custom_id?: string;
    }) => Promise<string>;
  };
};

type PayPalApproveData = {
  orderID?: string;
  subscriptionID?: string | null;
};

export function PayPalCheckoutButton({
  clientId,
  checkoutToken,
  orderType,
  currency
}: PayPalCheckoutButtonProps) {
  const t = useI18n({ area: 'global' });
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
          intent: orderType === 'one_time' ? 'capture' : 'subscription',
          vault: orderType === 'subscription',
          components: ['buttons']
        });

        if (isUnmounted || !paypalClient?.Buttons || !containerRef.current) {
          return;
        }

        const buttons = paypalClient.Buttons({
          style: {
            color: 'blue',
            label: orderType === 'one_time' ? 'pay' : 'subscribe',
            layout: 'vertical',
            shape: 'pill'
          },
          onClick: async (_: unknown, actions: PayPalClickActions) => {
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
          ...(orderType === 'subscription'
            ? {
                createSubscription: async (
                  _: unknown,
                  actions: PayPalSubscriptionActions
                ) => {
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
                  const customId =
                    typeof paymentStartBody.clientPayload?.customId === 'string'
                      ? paymentStartBody.clientPayload.customId
                      : undefined;

                  if (!paymentStartResponse.ok || !paymentStartBody.ok || !planId) {
                    if (
                      paymentStartResponse.status === 401 &&
                      paymentStartBody.redirectUrl
                    ) {
                      window.location.href = paymentStartBody.redirectUrl;
                      return Promise.reject(new Error('Unauthorized'));
                    }

                    setError(
                      paymentStartBody.error ||
                        t('Unable to confirm PayPal subscription.')
                    );
                    return Promise.reject(new Error('Plan not available'));
                  }

                  return actions.subscription.create({
                    plan_id: planId,
                    custom_id: customId
                  });
                }
              }
            : {
                createOrder: async (_: unknown) => {
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
                  const orderId =
                    typeof paymentStartBody.clientPayload?.orderId === 'string'
                      ? paymentStartBody.clientPayload.orderId
                      : typeof paymentStartBody.clientPayload?.providerSessionId ===
                            'string'
                        ? paymentStartBody.clientPayload.providerSessionId
                        : '';

                  if (!paymentStartResponse.ok || !paymentStartBody.ok || !orderId) {
                    if (
                      paymentStartResponse.status === 401 &&
                      paymentStartBody.redirectUrl
                    ) {
                      window.location.href = paymentStartBody.redirectUrl;
                      return Promise.reject(new Error('Unauthorized'));
                    }

                    setError(
                      paymentStartBody.error ||
                        t('Unable to prepare PayPal payment.')
                    );
                    return Promise.reject(new Error('Order not available'));
                  }

                  return orderId;
                }
              }),
          onApprove: async (data: PayPalApproveData) => {
            const isOneTime = orderType === 'one_time';
            const providerReferenceId = isOneTime
              ? data.orderID
              : data.subscriptionID;
            if (!providerReferenceId) {
              setError(
                isOneTime
                  ? t('PayPal did not return an order ID.')
                  : t('PayPal did not return a subscription ID.')
              );
              return;
            }

            const response = await fetch('/api/checkout/methods/paypal/return', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...(isOneTime
                  ? { orderId: providerReferenceId }
                  : { subscriptionId: providerReferenceId }),
                checkoutToken
              })
            });

            const body = (await response.json().catch(() => ({}))) as CheckoutResponse;

            if (!response.ok) {
              if (response.status === 401 && body.redirectUrl) {
                window.location.href = body.redirectUrl;
                return;
              }

              setError(
                body.error ||
                  (isOneTime
                    ? t('Unable to confirm PayPal payment.')
                    : t('Unable to confirm PayPal subscription.'))
              );
              return;
            }

            window.location.href = body.redirectUrl || `/checkout/${checkoutToken}`;
          },
          onCancel: async () => {
            await fetch(
              `/api/checkout/methods/paypal/cancel?checkoutToken=${encodeURIComponent(checkoutToken)}`,
              {
                method: 'POST'
              }
            ).catch(() => null);
            setError(t('PayPal checkout was canceled.'));
            window.location.reload();
          },
          onError: () => {
            setError(
              orderType === 'one_time'
                ? t('PayPal payment failed. Please try again.')
                : t('PayPal checkout failed. Please try again.')
            );
          }
        });

        if (!buttons.isEligible()) {
          setError(t('PayPal is not available for this account.'));
          return;
        }

        closeButtons = buttons.close;
        await buttons.render(containerRef.current);
      } catch {
        if (!isUnmounted) {
          setError(t('Unable to load PayPal checkout.'));
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
  }, [checkoutToken, clientId, currency, orderType, t]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="overflow-hidden rounded-sm" />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
