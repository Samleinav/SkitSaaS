import 'server-only';

import type {
  TemplateArea,
  TemplateResolutionSource
} from '@/lib/templates/controller';
import { resolveTemplateForArea } from '@/lib/templates/runtime';
import {
  normalizeUiAsyncSubmitButtonTemplatePayload,
  type UiAsyncSubmitButtonTemplatePayload
} from '@/lib/templates/ui-async-submit-button-payload';

export type UiAsyncSubmitButtonTemplateState = {
  source: TemplateResolutionSource;
  templateId: string | null;
  payload: UiAsyncSubmitButtonTemplatePayload;
};

export async function resolveUiAsyncSubmitButtonTemplateForArea({
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
}): Promise<UiAsyncSubmitButtonTemplateState> {
  const resolution = await resolveTemplateForArea({
    componentId: 'ui.async-submit-button',
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
    payload: normalizeUiAsyncSubmitButtonTemplatePayload(resolution.entry?.payload)
  };
}

