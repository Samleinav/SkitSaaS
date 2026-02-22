import type { ReactNode } from 'react';
export type ThemeAssetArea = 'admin' | 'dashboard' | 'frontend' | 'global';
export type ThemeAssetPathMap = Partial<Record<ThemeAssetArea, string>>;
export type ThemeAssetListPathMap = Partial<Record<ThemeAssetArea, string | string[]>>;
export type ThemeAssetBooleanMap = Partial<Record<ThemeAssetArea, boolean>>;
export type ThemeTemplateIdMap = Partial<Record<ThemeAssetArea, string>>;
export type ThemeHeadConfig = {
    fonts?: string[];
    links?: Array<{
        rel: string;
        href: string;
        crossOrigin?: string;
    }>;
};
export type ThemeAssetsConfig = {
    globalCssByArea?: ThemeAssetPathMap;
    scriptByArea?: ThemeAssetPathMap;
    additionalCssByArea?: ThemeAssetListPathMap;
    additionalScriptByArea?: ThemeAssetListPathMap;
    ignoreCoreCssByArea?: ThemeAssetBooleanMap;
    ignoreCoreScriptByArea?: ThemeAssetBooleanMap;
    faviconByArea?: ThemeAssetPathMap;
    notFoundTemplateByArea?: ThemeTemplateIdMap;
    loginThemeAreaByPath?: Record<string, 'admin' | 'dashboard'>;
};
export type ThemeProviderProps = {
    children: ReactNode;
};
export type ThemeConfig = {
    Provider?: (props: ThemeProviderProps) => ReactNode;
    head?: ThemeHeadConfig;
    assets?: ThemeAssetsConfig;
};
export declare function defineThemeConfig(config: ThemeConfig): ThemeConfig;
