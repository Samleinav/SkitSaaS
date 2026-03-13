import type { BuildFormUiTemplateResolverAdapter, BuildFormUiTemplateResolverContext, BuildFormUiTemplateResolution } from './build-form-contract.js';
export declare function configureBuildFormUiTemplateResolver(adapter: BuildFormUiTemplateResolverAdapter | null): void;
export declare function resolveBuildFormUiTemplate(context: BuildFormUiTemplateResolverContext): Promise<BuildFormUiTemplateResolution | null>;
