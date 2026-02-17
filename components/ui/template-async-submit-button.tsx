import type { TemplateArea } from '@/lib/templates/controller';
import {
  AsyncSubmitButton,
  type AsyncSubmitButtonProps
} from '@/components/ui/async-submit-button';
import { resolveUiAsyncSubmitButtonTemplateForArea } from '@/lib/templates/ui-async-submit-button';
import { cn } from '@/lib/utils';

type TemplateAsyncSubmitButtonProps = Omit<
  AsyncSubmitButtonProps,
  'templateId' | 'templateSource' | 'templateComponentId'
> & {
  area: TemplateArea;
  route?: string | null;
  themeId?: string | null;
  moduleId?: string | null;
  data?: unknown;
};

export async function TemplateAsyncSubmitButton({
  area,
  route = null,
  themeId = null,
  moduleId = null,
  data,
  className,
  iconClassName,
  ...props
}: TemplateAsyncSubmitButtonProps) {
  const template = await resolveUiAsyncSubmitButtonTemplateForArea({
    area,
    route,
    themeId,
    moduleId,
    data
  });

  return (
    <AsyncSubmitButton
      className={cn(template.payload.className, className)}
      iconClassName={cn(template.payload.iconClassName, iconClassName)}
      templateComponentId="ui.async-submit-button"
      templateId={template.templateId}
      templateSource={template.source}
      {...props}
    />
  );
}

