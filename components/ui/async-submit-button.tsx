'use client';

import * as React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { getTemplateDebugMetadataAttributes } from '@/lib/templates/debug';
import { cn } from '@/lib/utils';

export type AsyncSubmitButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'children' | 'type'
> & {
  idleLabel: string;
  idleIcon?: React.ReactNode;
  pendingLabel?: string;
  successLabel?: string;
  successDurationMs?: number;
  iconClassName?: string;
  templateId?: string | null;
  templateSource?: string | null;
  templateComponentId?: string | null;
};

export function AsyncSubmitButton({
  idleLabel,
  idleIcon,
  pendingLabel,
  successLabel,
  successDurationMs = 1800,
  iconClassName,
  templateId,
  templateSource,
  templateComponentId,
  disabled,
  ...props
}: AsyncSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [isRecentlySuccessful, setIsRecentlySuccessful] = React.useState(false);
  const hasPendingRef = React.useRef(false);

  React.useEffect(() => {
    if (pending) {
      hasPendingRef.current = true;
      setIsRecentlySuccessful(false);
      return;
    }

    if (!hasPendingRef.current) {
      return;
    }

    hasPendingRef.current = false;
    setIsRecentlySuccessful(true);

    const timeout = window.setTimeout(() => {
      setIsRecentlySuccessful(false);
    }, successDurationMs);

    return () => window.clearTimeout(timeout);
  }, [pending, successDurationMs]);

  const isDisabled = Boolean(disabled) || pending;
  const label = pending
    ? (pendingLabel ?? idleLabel)
    : isRecentlySuccessful
      ? (successLabel ?? idleLabel)
      : idleLabel;
  const debugMetadataAttrs = getTemplateDebugMetadataAttributes({
    componentId: templateComponentId,
    templateId,
    templateSource
  });

  return (
    <Button
      type="submit"
      disabled={isDisabled}
      {...debugMetadataAttrs}
      {...props}
    >
      {pending ? (
        <Loader2 className={cn('h-4 w-4 animate-spin', iconClassName)} />
      ) : isRecentlySuccessful ? (
        <Check className={cn('h-4 w-4', iconClassName)} />
      ) : idleIcon ? (
        idleIcon
      ) : null}
      {label}
    </Button>
  );
}
