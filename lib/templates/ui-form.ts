import type {
  TemplateArea,
  TemplateResolutionSource
} from '@/lib/templates/controller';
import { resolveTemplateForArea } from '@/lib/templates/runtime';
import {
  normalizeUiFormTemplatePayload,
  type UiFormTemplatePayload
} from '@/lib/templates/ui-form-payload';

export type UiFormTemplateState = {
  source: TemplateResolutionSource;
  templateId: string | null;
  payload: UiFormTemplatePayload;
};

export async function resolveUiFormTemplateForArea({
  area,
  route = null,
  themeId = null,
  moduleId = null,
  data
}: {
  area: TemplateArea;
  route?: string | null;
  themeId?: string | null;
  moduleId?: string | null;
  data?: unknown;
}): Promise<UiFormTemplateState> {
  const resolution = await resolveTemplateForArea({
    componentId: 'ui.form',
    context: {
      area,
      route,
      themeId,
      moduleId,
      data
    }
  });

  return {
    source: resolution.source,
    templateId: resolution.entry?.templateId ?? null,
    payload: normalizeUiFormTemplatePayload(resolution.entry?.payload)
  };
}
