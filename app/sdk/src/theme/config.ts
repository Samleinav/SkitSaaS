import type { ReactNode } from 'react';

export type ThemeAssetArea = 'admin' | 'dashboard' | 'frontend' | 'global';
export type ThemeAssetPathMap = Partial<Record<ThemeAssetArea, string>>;
export type ThemeTemplateIdMap = Partial<Record<ThemeAssetArea, string>>;

export type ThemeHeadConfig = {
  fonts?: string[];
  links?: Array<{ rel: string; href: string; crossOrigin?: string }>;
};

export type ThemeAssetsConfig = {
  globalCssByArea?: ThemeAssetPathMap;
  scriptByArea?: ThemeAssetPathMap;
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

export function defineThemeConfig(config: ThemeConfig): ThemeConfig {
  return config;
}
