import type { TemplateArea } from '@/lib/templates/controller';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import type { ComponentProps } from 'react';
import { resolveUiAlertDialogTemplateForArea } from '@/lib/templates/ui-alert-dialog';
import { cn } from '@/lib/utils';

type ConfirmSubmitButtonProps = ComponentProps<typeof ConfirmSubmitButton>;

type TemplateConfirmSubmitButtonProps = Omit<
  ConfirmSubmitButtonProps,
  | 'templateId'
  | 'templateSource'
  | 'templateComponentId'
  | 'className'
  | 'contentClassName'
  | 'titleClassName'
  | 'descriptionClassName'
  | 'footerClassName'
  | 'cancelButtonClassName'
  | 'confirmButtonClassName'
> &
  Pick<
    ConfirmSubmitButtonProps,
    | 'className'
    | 'contentClassName'
    | 'titleClassName'
    | 'descriptionClassName'
    | 'footerClassName'
    | 'cancelButtonClassName'
    | 'confirmButtonClassName'
  > & {
    area: TemplateArea;
    route?: string | null;
    themeId?: string | null;
    moduleId?: string | null;
    data?: unknown;
  };

export async function TemplateConfirmSubmitButton({
  area,
  route = null,
  themeId = null,
  moduleId = null,
  data,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
  footerClassName,
  cancelButtonClassName,
  confirmButtonClassName,
  ...props
}: TemplateConfirmSubmitButtonProps) {
  const template = await resolveUiAlertDialogTemplateForArea({
    area,
    route,
    themeId,
    moduleId,
    data
  });

  return (
    <ConfirmSubmitButton
      className={cn(template.payload.triggerClassName, className)}
      contentClassName={cn(template.payload.contentClassName, contentClassName)}
      titleClassName={cn(template.payload.titleClassName, titleClassName)}
      descriptionClassName={cn(
        template.payload.descriptionClassName,
        descriptionClassName
      )}
      footerClassName={cn(template.payload.footerClassName, footerClassName)}
      cancelButtonClassName={cn(
        template.payload.cancelButtonClassName,
        cancelButtonClassName
      )}
      confirmButtonClassName={cn(
        template.payload.confirmButtonClassName,
        confirmButtonClassName
      )}
      templateComponentId="ui.alert-dialog"
      templateId={template.templateId}
      templateSource={template.source}
      {...props}
    />
  );
}

