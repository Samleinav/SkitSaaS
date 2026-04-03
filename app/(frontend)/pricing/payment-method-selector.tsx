'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ThemeTemplate } from '@/components/ui/theme-template';
import {
  CircleDollarSign,
  CreditCard,
  Landmark,
  QrCode,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethod = string;

export type PaymentMethodOption = {
  id: PaymentMethod;
  label: string;
  description?: string | null;
  badge?: string | null;
  iconKey?: string | null;
  content: ReactNode;
};

export function resolvePaymentMethodIcon(iconKey?: string | null) {
  const normalized = String(iconKey ?? '').trim().toLowerCase();
  if (normalized === 'credit-card') {
    return CreditCard;
  }

  if (normalized === 'wallet') {
    return Wallet;
  }

  if (normalized === 'bank') {
    return Landmark;
  }

  if (normalized === 'qr') {
    return QrCode;
  }

  return CircleDollarSign;
}

export type PaymentMethodSelectorProps = {
  label: string;
  options: PaymentMethodOption[];
  defaultMethod?: PaymentMethod | null;
};

export function PaymentMethodSelectorRenderer({
  label,
  options,
  defaultMethod
}: PaymentMethodSelectorProps) {
  const availableOptions = useMemo(
    () => options.filter(Boolean),
    [options]
  );
  const initial = useMemo(() => {
    if (defaultMethod && availableOptions.some((opt) => opt.id === defaultMethod)) {
      return defaultMethod;
    }
    return availableOptions[0]?.id ?? '';
  }, [availableOptions, defaultMethod]);
  const [selected, setSelected] = useState<PaymentMethod>(initial);

  if (availableOptions.length === 0) {
    return null;
  }

  const selectedOption =
    availableOptions.find((option) => option.id === selected) ??
    availableOptions[0];

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {availableOptions.map((option) => {
          const isActive = option.id === selected;
          const Icon = resolvePaymentMethodIcon(option.iconKey);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                isActive
                  ? 'border-amber-200/60 bg-amber-200/15 text-zinc-50 shadow-[0_0_0_1px_rgba(251,191,36,0.1)]'
                  : 'border-white/10 bg-white/[0.02] text-zinc-300 hover:border-amber-200/30 hover:bg-white/[0.04]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                      isActive
                        ? 'border-amber-200/40 bg-amber-200/12 text-amber-100'
                        : 'border-white/10 bg-black/20 text-zinc-300'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="mt-1 block text-xs leading-5 text-zinc-400">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </div>
                {option.badge ? (
                  <span
                    className={cn(
                      'inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]',
                      isActive
                        ? 'border-amber-200/40 bg-amber-200/10 text-amber-100'
                        : 'border-white/10 text-zinc-400'
                    )}
                  >
                    {option.badge}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        {selectedOption?.content}
      </div>
    </div>
  );
}

export function PaymentMethodSelector(props: PaymentMethodSelectorProps) {
  const fallback = <PaymentMethodSelectorRenderer {...props} />;

  return (
    <ThemeTemplate
      id="ui.checkout.payment-method-selector"
      data={{
        label: props.label,
        options: props.options,
        defaultMethod: props.defaultMethod ?? null
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeTemplate>
  );
}
