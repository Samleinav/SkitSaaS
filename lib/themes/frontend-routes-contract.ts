import type { ComponentType, ReactNode } from 'react';

export type FrontendThemeRouteComponentProps<TData = unknown> = {
  data?: TData;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export type FrontendThemeRouteComponent<TData = unknown> = ComponentType<
  FrontendThemeRouteComponentProps<TData>
>;

export type FrontendThemeRouteLoader = () => Promise<{
  default: FrontendThemeRouteComponent<any>;
}>;

export type FrontendThemeRouteDefinition = {
  path: string;
  loader: FrontendThemeRouteLoader;
  metadata?: Record<string, unknown>;
};

export type FrontendThemeRoutesModule =
  | FrontendThemeRouteDefinition[]
  | {
      routes: FrontendThemeRouteDefinition[];
    };

export type FrontendThemeRoutesImport = () => Promise<{
  default?: FrontendThemeRoutesModule;
  routes?: FrontendThemeRouteDefinition[];
}>;
