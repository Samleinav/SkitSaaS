'use client';

import { ArrowRight } from 'lucide-react';
import { useAreaMessages } from '@/lib/i18n/client';
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
  const messages = useAreaMessages('global');
  const submitButton = messages.submitButton;
  const idleLabel = disabled
    ? disabledLabel || submitButton.comingSoon
    : submitButton.getStarted;

  return (
    <ThemedAsyncSubmitButton
      themeId={themeId}
      slot="frontend.pricing.submit"
      idleLabel={idleLabel}
      pendingLabel={submitButton.loading}
      idleIcon={disabled ? null : <ArrowRight className="ml-2 h-4 w-4" />}
      disabled={disabled}
      variant="outline"
      className="w-full rounded-sm border-amber-200/30 bg-amber-200/10 text-[11px] tracking-[0.18em] text-amber-100 uppercase hover:bg-amber-200 hover:text-black"
    />
  );
}
