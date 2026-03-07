import type {
  TemplateArea,
  TemplateResolutionSource
} from '@/lib/templates/controller';
import { resolveTemplateForArea } from '@/lib/templates/runtime';
import {
  normalizeUiTableTemplatePayload,
  type UiTableTemplatePayload
} from '@/lib/templates/ui-table-payload';

export type UiTableTemplateState = {
  source: TemplateResolutionSource;
  templateId: string | null;
  payload: UiTableTemplatePayload;
};

export async function resolveUiTableTemplateForArea({
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
}): Promise<UiTableTemplateState> {
  const resolution = await resolveTemplateForArea({
    componentId: 'ui.table',
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
    payload: normalizeUiTableTemplatePayload(resolution.entry?.payload)
  };
}
