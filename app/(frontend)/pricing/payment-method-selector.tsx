'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type PaymentMethod = string;

type PaymentMethodOption = {
  id: PaymentMethod;
  label: string;
  content: ReactNode;
};

export function PaymentMethodSelector({
  label,
  options,
  defaultMethod
}: {
  label: string;
  options: PaymentMethodOption[];
  defaultMethod?: PaymentMethod | null;
}) {
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
      <div className="grid grid-cols-2 gap-2">
        {availableOptions.map((option) => {
          const isActive = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              className={cn(
                'rounded-md border px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] transition',
                isActive
                  ? 'border-amber-200/60 bg-amber-200/15 text-amber-100'
                  : 'border-white/10 text-zinc-400 hover:border-amber-200/30 hover:text-zinc-200'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div>{selectedOption?.content}</div>
    </div>
  );
}
