let buildFormUiTemplateResolver = null;
export function configureBuildFormUiTemplateResolver(adapter) {
    buildFormUiTemplateResolver = adapter;
}
export async function resolveBuildFormUiTemplate(context) {
    if (!buildFormUiTemplateResolver?.resolveFormTemplate) {
        return null;
    }
    return buildFormUiTemplateResolver.resolveFormTemplate(context);
}
