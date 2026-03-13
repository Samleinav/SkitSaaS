import type { ReactNode } from 'react';
import type { BuildFormDefinition } from '../forms.js';
export type SdkBuildFormTemplatePayload = {
    formClassName?: string;
    headerClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    sectionClassName?: string;
    sectionHeaderClassName?: string;
    sectionTitleClassName?: string;
    sectionDescriptionClassName?: string;
    gridClassName?: string;
    fieldClassName?: string;
    labelClassName?: string;
    descriptionTextClassName?: string;
    fieldErrorTextClassName?: string;
    inputClassName?: string;
    textareaClassName?: string;
    selectClassName?: string;
    checkboxWrapperClassName?: string;
    formErrorClassName?: string;
    actionsClassName?: string;
};
export type SdkBuildFormProps = {
    definition: BuildFormDefinition;
    area?: string;
    className?: string;
    themeId?: string | null;
    slot?: string;
    route?: string | null;
    moduleId?: string | null;
    data?: unknown;
    templateId?: string | null;
    templateSource?: string | null;
    templateComponentId?: string | null;
    templatePayload?: SdkBuildFormTemplatePayload;
    templateRenderer?: (props: SdkBuildFormProps) => ReactNode;
};
export type BuildFormUiAdapter = {
    renderBuildForm?: (props: SdkBuildFormProps) => ReactNode;
};
export type BuildFormUiTemplateResolverContext = {
    area: string;
    route?: string | null;
    themeId?: string | null;
    moduleId?: string | null;
    data?: unknown;
};
export type BuildFormUiTemplateResolution = {
    templateId?: string | null;
    templateSource?: string | null;
    templateComponentId?: string | null;
    templatePayload?: SdkBuildFormTemplatePayload | null;
};
export type BuildFormUiTemplateResolverAdapter = {
    resolveFormTemplate?: (context: BuildFormUiTemplateResolverContext) => Promise<BuildFormUiTemplateResolution | null> | BuildFormUiTemplateResolution | null;
};
