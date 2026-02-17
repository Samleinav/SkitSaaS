'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

type ButtonVariant = React.ComponentProps<typeof Button>['variant'];
type ButtonSize = React.ComponentProps<typeof Button>['size'];

type ConfirmSubmitButtonProps = {
  formId: string;
  title: string;
  description?: string;
  triggerLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  confirmVariant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  footerClassName?: string;
  cancelButtonClassName?: string;
  confirmButtonClassName?: string;
  templateId?: string | null;
  templateSource?: string | null;
  templateComponentId?: string | null;
};

export function ConfirmSubmitButton({
  formId,
  title,
  description,
  triggerLabel,
  confirmLabel,
  cancelLabel,
  triggerVariant = 'outline',
  triggerSize = 'sm',
  confirmVariant = 'destructive',
  disabled,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
  footerClassName,
  cancelButtonClassName,
  confirmButtonClassName,
  templateId,
  templateSource,
  templateComponentId
}: ConfirmSubmitButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          disabled={disabled}
          data-template-component={templateComponentId || undefined}
          data-template-id={templateId || undefined}
          data-template-source={templateSource || undefined}
          className={className}
        >
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        data-template-component={templateComponentId || undefined}
        data-template-id={templateId || undefined}
        data-template-source={templateSource || undefined}
        className={contentClassName}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={titleClassName}>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className={descriptionClassName}>
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className={footerClassName}>
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              className={cancelButtonClassName}
            >
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="submit"
              form={formId}
              variant={confirmVariant}
              className={confirmButtonClassName}
              data-confirm-submit="true"
            >
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
