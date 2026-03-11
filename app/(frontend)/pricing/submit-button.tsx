'use client';

import { ArrowRight } from 'lucide-react';
import { useI18n } from '@skitsaas/sdk';
import { ThemedAsyncSubmitButton } from '@/components/ui/themed-async-submit-button';

export function SubmitButton({
  disabled = false,
  disabledLabel = null,
  themeId = null
}: {
  disabled?: boolean;
  disabledLabel?: string | null;
  themeId?: string | null;
}) {
  const t = useI18n({ themeId, area: 'frontend' });
  const idleLabel = disabled
    ? disabledLabel || t('Unavailable')
    : t('Choose plan');

  return (
    <ThemedAsyncSubmitButton
      themeId={themeId}
      slot="frontend.pricing.submit"
      idleLabel={idleLabel}
      pendingLabel={t('Loading...')}
      idleIcon={disabled ? null : <ArrowRight className="ml-2 h-4 w-4" />}
      disabled={disabled}
      variant="outline"
      className="h-12 w-full rounded-full border-amber-200/30 bg-amber-200/12 px-5 text-[11px] tracking-[0.18em] text-amber-100 uppercase hover:bg-amber-200 hover:text-black"
    />
  );
}
