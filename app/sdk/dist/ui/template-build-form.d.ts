import type { SdkBuildFormProps } from './build-form-contract.js';
export type SdkTemplateBuildFormProps = Omit<SdkBuildFormProps, 'templateId' | 'templateSource' | 'templateComponentId' | 'templatePayload'> & {
    area: string;
};
export declare function TemplateBuildForm({ area, route, themeId, moduleId, data, ...props }: SdkTemplateBuildFormProps): Promise<import("react/jsx-runtime").JSX.Element>;
