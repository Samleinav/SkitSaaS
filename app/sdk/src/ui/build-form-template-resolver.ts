import type {
  BuildFormUiTemplateResolverAdapter,
  BuildFormUiTemplateResolverContext,
  BuildFormUiTemplateResolution,
} from './build-form-contract.js';

let buildFormUiTemplateResolver:
  | BuildFormUiTemplateResolverAdapter
  | null = null;

export function configureBuildFormUiTemplateResolver(
  adapter: BuildFormUiTemplateResolverAdapter | null
) {
  buildFormUiTemplateResolver = adapter;
}

export async function resolveBuildFormUiTemplate(
  context: BuildFormUiTemplateResolverContext
): Promise<BuildFormUiTemplateResolution | null> {
  if (!buildFormUiTemplateResolver?.resolveFormTemplate) {
    return null;
  }

  return buildFormUiTemplateResolver.resolveFormTemplate(context);
}
