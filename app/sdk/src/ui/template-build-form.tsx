import { BuildForm } from './build-form.js';
import type { SdkBuildFormProps } from './build-form-contract.js';
import { resolveBuildFormUiTemplate } from './build-form-template-resolver.js';

export type SdkTemplateBuildFormProps = Omit<
  SdkBuildFormProps,
  'templateId' | 'templateSource' | 'templateComponentId' | 'templatePayload'
> & {
  area: string;
};

export async function TemplateBuildForm({
  area,
  route = null,
  themeId = null,
  moduleId = null,
  data,
  ...props
}: SdkTemplateBuildFormProps) {
  const template = await resolveBuildFormUiTemplate({
    area,
    route,
    themeId,
    moduleId,
    data,
  });

  return (
    <BuildForm
      area={area}
      route={route}
      themeId={themeId}
      moduleId={moduleId}
      data={data}
      templateId={template?.templateId ?? null}
      templateSource={template?.templateSource ?? null}
      templateComponentId={template?.templateComponentId ?? 'ui.form'}
      templatePayload={template?.templatePayload ?? undefined}
      {...props}
    />
  );
}
