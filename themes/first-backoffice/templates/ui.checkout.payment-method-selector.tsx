'use client';

import type { ComponentType, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  CircleDollarSign,
  CreditCard,
  Landmark,
  QrCode,
  Wallet
} from 'lucide-react';
import type { TemplateProps } from './template-types';

type UiCheckoutPaymentMethodSelectorOption = {
  id: string;
  label: string;
  description?: string | null;
  badge?: string | null;
  iconKey?: string | null;
  content: ReactNode;
};

type UiCheckoutPaymentMethodSelectorTemplateData = {
  label: string;
  options: UiCheckoutPaymentMethodSelectorOption[];
  defaultMethod?: string | null;
};

function resolveIcon(iconKey?: string | null): ComponentType<{ className?: string }> {
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

export default function UiCheckoutPaymentMethodSelectorTemplate({
  data
}: TemplateProps<UiCheckoutPaymentMethodSelectorTemplateData>) {
  const options = useMemo(() => data?.options ?? [], [data?.options]);
  const initial = useMemo(() => {
    if (
      data?.defaultMethod &&
      options.some((option) => option.id === data.defaultMethod)
    ) {
      return data.defaultMethod;
    }

    return options[0]?.id ?? '';
  }, [data?.defaultMethod, options]);
  const [selected, setSelected] = useState(initial);

  if (options.length === 0) {
    return null;
  }

  const selectedOption =
    options.find((option) => option.id === selected) ?? options[0];

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
        {data?.label}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = option.id === selected;
          const Icon = resolveIcon(option.iconKey);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              className={[
                'rounded-xl border p-4 text-left transition',
                isActive
                  ? 'border-amber-200/50 bg-amber-200/10 text-zinc-50'
                  : 'border-white/10 bg-white/[0.02] text-zinc-300 hover:border-amber-200/25 hover:bg-white/[0.04]'
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={[
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                      isActive
                        ? 'border-amber-200/35 bg-amber-200/10 text-amber-100'
                        : 'border-white/10 bg-black/20 text-zinc-300'
                    ].join(' ')}
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
                  <span className="inline-flex shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400">
                    {option.badge}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        {selectedOption?.content}
      </div>
    </div>
  );
}
