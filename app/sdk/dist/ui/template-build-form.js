import { jsx as _jsx } from "react/jsx-runtime";
import { BuildForm } from './build-form.js';
import { resolveBuildFormUiTemplate } from './build-form-template-resolver.js';
export async function TemplateBuildForm({ area, route = null, themeId = null, moduleId = null, data, ...props }) {
    const template = await resolveBuildFormUiTemplate({
        area,
        route,
        themeId,
        moduleId,
        data,
    });
    return (_jsx(BuildForm, { area: area, route: route, themeId: themeId, moduleId: moduleId, data: data, templateId: template?.templateId ?? null, templateSource: template?.templateSource ?? null, templateComponentId: template?.templateComponentId ?? 'ui.form', templatePayload: template?.templatePayload ?? undefined, ...props }));
}
