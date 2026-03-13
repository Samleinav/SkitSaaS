export type ThemeSelectionArea = "admin" | "dashboard" | "frontend";
export type ThemeSelectionSource = "env" | "legacy_env" | "default";
export type ThemeTemplatePriority = "theme" | "module";

export type ThemeAreaSelection = {
  area: ThemeSelectionArea;
  themeId: string;
  source: ThemeSelectionSource;
  envKey: string;
  legacyEnvKey: string | null;
};

export const THEME_SELECTIONS: ThemeAreaSelection[] = [
  {
    "area": "admin",
    "themeId": "theme.first.backoffice",
    "source": "default",
    "envKey": "THEME_ADMIN",
    "legacyEnvKey": "THEME_ADMIN_DEFAULT"
  },
  {
    "area": "dashboard",
    "themeId": "theme.first.backoffice",
    "source": "default",
    "envKey": "THEME_DASHBOARD",
    "legacyEnvKey": "THEME_DASHBOARD_DEFAULT"
  },
  {
    "area": "frontend",
    "themeId": "theme.first.frontend",
    "source": "default",
    "envKey": "THEME_FRONTEND",
    "legacyEnvKey": null
  }
];

export const THEME_SELECTION_BY_AREA: Record<ThemeSelectionArea, string> = {
  "admin": "theme.first.backoffice",
  "dashboard": "theme.first.backoffice",
  "frontend": "theme.first.frontend"
};

export const THEME_TEMPLATE_PRIORITY: ThemeTemplatePriority = "theme";

export const ACTIVE_THEME_IDS: string[] = [
  "theme.first.backoffice",
  "theme.first.frontend"
];

// Decision: keep code registry generation for all discovered packs.
export const THEME_CODE_REGISTRY_SCOPE = "all" as const;
