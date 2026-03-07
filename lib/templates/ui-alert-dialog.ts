import type {
  TemplateArea,
  TemplateResolutionSource
} from '@/lib/templates/controller';
import { resolveTemplateForArea } from '@/lib/templates/runtime';
import {
  normalizeUiAlertDialogTemplatePayload,
  type UiAlertDialogTemplatePayload
} from '@/lib/templates/ui-alert-dialog-payload';

export type UiAlertDialogTemplateState = {
  source: TemplateResolutionSource;
  templateId: string | null;
  payload: UiAlertDialogTemplatePayload;
};

export async function resolveUiAlertDialogTemplateForArea({
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
}): Promise<UiAlertDialogTemplateState> {
  const resolution = await resolveTemplateForArea({
    componentId: 'ui.alert-dialog',
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
    payload: normalizeUiAlertDialogTemplatePayload(resolution.entry?.payload)
  };
}
