'use client';

import { loadScript } from '@paypal/paypal-js';
import { useEffect, useRef, useState } from 'react';
import { useAreaMessages } from '@/lib/i18n/client';

type PayPalButtonProps = {
  clientId: string;
  templateId: number;
  currency: string;
  changeMode?: 'immediate' | 'period_end' | null;
  scheduledStartTime?: string | null;
};

type CheckoutResponse = {
  error?: string;
  redirectUrl?: string;
};

type PlanResponse = {
  error?: string;
  planId?: string;
  redirectUrl?: string;
};

export function PayPalButton({
  clientId,
  templateId,
  currency,
  changeMode = null,
  scheduledStartTime = null
}: PayPalButtonProps) {
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
            const planResponse = await fetch('/api/paypal/plan', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ templateId })
            });

            const planBody = (await planResponse
              .json()
              .catch(() => ({}))) as PlanResponse;

            if (!planResponse.ok || !planBody.planId) {
              if (planResponse.status === 401 && planBody.redirectUrl) {
                window.location.href = planBody.redirectUrl;
                return Promise.reject(new Error('Unauthorized'));
              }

              setError(planBody.error || paypalMessages.unableToConfirm);
              return Promise.reject(new Error('Plan not available'));
            }

            return actions.subscription.create({
              plan_id: planBody.planId,
              ...(changeMode === 'period_end' && scheduledStartTime
                ? { start_time: scheduledStartTime }
                : {})
            });
          },
          onApprove: async (data) => {
            if (!data.subscriptionID) {
              setError(paypalMessages.missingSubscriptionId);
              return;
            }

            const response = await fetch('/api/paypal/checkout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                subscriptionId: data.subscriptionID,
                templateId,
                changeMode
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
          onCancel: () => {
            setError(paypalMessages.canceled);
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
  }, [
    clientId,
    currency,
    templateId,
    paypalMessages,
    changeMode,
    scheduledStartTime
  ]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="overflow-hidden rounded-sm" />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
