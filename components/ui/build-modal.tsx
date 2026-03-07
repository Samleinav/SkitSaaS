'use client';

import type { ReactNode } from 'react';
import type { BuildModalDefinition } from '@skitsaas/sdk';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ThemeTemplate } from '@/components/ui/theme-template';

type UiTemplateArea = 'admin' | 'dashboard' | 'frontend' | 'global';

export type BuildModalProps = {
  definition: BuildModalDefinition;
  children?: ReactNode;
  triggerIcon?: ReactNode;
  slot?: string;
  themeId?: string | null;
  area?: UiTemplateArea;
  className?: string;
  contentClassName?: string;
  cancelButtonClassName?: string;
  confirmButtonClassName?: string;
};

function normalizeThemeId(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeArea(value: string | null | undefined): UiTemplateArea | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'public') {
    return 'frontend';
  }

  if (
    normalized === 'admin' ||
    normalized === 'dashboard' ||
    normalized === 'frontend' ||
    normalized === 'global'
  ) {
    return normalized;
  }

  return null;
}

export function BuildModal({
  definition,
  children,
  triggerIcon,
  slot,
  themeId,
  area,
  className,
  contentClassName,
  cancelButtonClassName,
  confirmButtonClassName
}: BuildModalProps) {
  const resolvedThemeId = normalizeThemeId(themeId);
  const resolvedArea = normalizeArea(area);
  const kind = definition.kind ?? 'dialog';

  if (kind === 'confirm') {
    const fallback = (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant={definition.triggerVariant ?? 'outline'}
            size={definition.triggerSize ?? 'sm'}
            className={className}
          >
            {triggerIcon}
            {definition.triggerLabel}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className={contentClassName}>
          <AlertDialogHeader>
            <AlertDialogTitle>{definition.title}</AlertDialogTitle>
            {definition.description ? (
              <AlertDialogDescription>
                {definition.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                className={cancelButtonClassName}
              >
                {definition.cancelLabel ?? 'Cancel'}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type={definition.formId ? 'submit' : 'button'}
                form={definition.formId}
                variant={definition.confirmVariant ?? 'destructive'}
                className={confirmButtonClassName}
              >
                {definition.confirmLabel ?? 'Confirm'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    return (
      <ThemeTemplate
        id="ui.alert-dialog"
        themeId={resolvedThemeId}
        data={{
          area: resolvedArea,
          slot: typeof slot === 'string' ? slot : undefined
        }}
        fallback={fallback}
      >
        {fallback}
      </ThemeTemplate>
    );
  }

  const fallback = (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={definition.triggerVariant ?? 'default'}
          size={definition.triggerSize ?? 'sm'}
          className={className}
        >
          {triggerIcon}
          {definition.triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{definition.title}</DialogTitle>
          {definition.description ? (
            <DialogDescription>{definition.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );

  return (
    <ThemeTemplate
      id="ui.dialog"
      themeId={resolvedThemeId}
      data={{
        area: resolvedArea,
        slot: typeof slot === 'string' ? slot : undefined
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeTemplate>
  );
}
