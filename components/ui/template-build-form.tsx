import type { BuildFormDefinition } from '@skitsaas/sdk';
import { BuildForm, type BuildFormProps } from '@/components/ui/build-form';
import type { TemplateArea } from '@/lib/templates/controller';
import { resolveUiFormTemplateForArea } from '@/lib/templates/ui-form';
import { cn } from '@/lib/utils';

type TemplateBuildFormProps = Omit<
  BuildFormProps,
  | 'templateId'
  | 'templateSource'
  | 'templateComponentId'
  | 'templatePayload'
  | 'definition'
> & {
  definition: BuildFormDefinition;
  area: TemplateArea;
  route?: string | null;
  themeId?: string | null;
  moduleId?: string | null;
  data?: unknown;
};

export async function TemplateBuildForm({
  definition,
  area,
  route = null,
  themeId = null,
  moduleId = null,
  data,
  className,
  ...props
}: TemplateBuildFormProps) {
  const template = await resolveUiFormTemplateForArea({
    area,
    route,
    themeId,
    moduleId,
    data
  });

  return (
    <BuildForm
      definition={definition}
      area={area}
      themeId={themeId}
      className={cn(className)}
      templateId={template.templateId}
      templateSource={template.source}
      templateComponentId="ui.form"
      templatePayload={template.payload}
      {...props}
    />
  );
}
