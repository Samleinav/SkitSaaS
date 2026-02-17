import type { FrontendThemeRoutesImport } from './frontend-routes-contract';

export type FrontendRouteRegistryThemeEntry = {
  themeId: string;
  routesImport: FrontendThemeRoutesImport;
};

export const THEME_FRONTEND_ROUTE_REGISTRY: Record<string, FrontendRouteRegistryThemeEntry> = {
  "theme.first.frontend": {
    themeId: "theme.first.frontend",
    routesImport: () => import("../../themes/first-frontend/routes"),
  },
};
