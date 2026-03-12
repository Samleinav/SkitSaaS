import * as React from 'react';
import type { BuildFormDefinition } from '../forms.js';
export type SdkBuildFormProps = {
    definition: BuildFormDefinition;
    area?: string;
    className?: string;
    /**
     * Optional custom renderer — supplied by the host/theme to replace the default
     * plain-Tailwind output with a fully-styled implementation (e.g. shadcn-based).
     *
     * This is the sdk-level hook for the `ui.form.*` template slot:
     *   <BuildForm definition={form} templateRenderer={hostRenderer} />
     */
    templateRenderer?: (props: SdkBuildFormProps) => React.ReactNode;
};
export declare function BuildForm(props: SdkBuildFormProps): import("react/jsx-runtime").JSX.Element;
