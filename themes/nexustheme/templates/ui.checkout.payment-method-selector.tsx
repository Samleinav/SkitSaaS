'use client';

import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import {
  CircleDollarSign,
  CreditCard,
  Landmark,
  QrCode,
  Wallet
} from 'lucide-react';
import type { UiCheckoutPaymentMethodSelectorTemplateData } from '@/lib/themes/template-data-contract';
import type { TemplateProps } from './template-types';

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
    <div className="space-y-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-200/70">
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
                'rounded-2xl border p-4 text-left transition',
                isActive
                  ? 'border-cyan-400/50 bg-cyan-400/10 text-zinc-50 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
                  : 'border-white/10 bg-white/[0.02] text-zinc-300 hover:border-cyan-400/30 hover:bg-white/[0.05]'
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={[
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                      isActive
                        ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200'
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
                  <span
                    className={[
                      'inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]',
                      isActive
                        ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200'
                        : 'border-white/10 text-zinc-400'
                    ].join(' ')}
                  >
                    {option.badge}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
        {selectedOption?.content}
      </div>
    </div>
  );
}
