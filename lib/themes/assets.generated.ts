export type ThemeSelectionArea = "admin" | "dashboard" | "frontend";

export type CoreAreaAssetsBundle = {
  cssHref: string | null;
  scriptHref: string | null;
};

export type ThemeAreaAssetsBundle = {
  cssHrefs: string[];
  scriptHrefs: string[];
  ignoreCoreCss: boolean;
  ignoreCoreScript: boolean;
};

export const CORE_ASSETS_BY_AREA: Record<ThemeSelectionArea, CoreAreaAssetsBundle> = {
  "admin": {
    "cssHref": "/.generated/core-assets/admin/core-97265c1039d4.css",
    "scriptHref": null
  },
  "dashboard": {
    "cssHref": "/.generated/core-assets/dashboard/core-97265c1039d4.css",
    "scriptHref": null
  },
  "frontend": {
    "cssHref": "/.generated/core-assets/frontend/core-97265c1039d4.css",
    "scriptHref": null
  }
};

export const THEME_ASSETS_BY_THEME_ID: Record<string, Record<ThemeSelectionArea, ThemeAreaAssetsBundle>> = {
  "theme.first.backoffice": {
    "admin": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.backoffice/admin/css/asset-1-3e12c5ae5640.css",
        "/.generated/theme-assets/theme.first.backoffice/admin/css/asset-2-c7bcad4f25bc.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    },
    "dashboard": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.backoffice/dashboard/css/asset-1-3e12c5ae5640.css",
        "/.generated/theme-assets/theme.first.backoffice/dashboard/css/asset-2-c7bcad4f25bc.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    },
    "frontend": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.backoffice/frontend/css/asset-1-3e12c5ae5640.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    }
  },
  "theme.first.frontend": {
    "admin": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.frontend/admin/css/asset-1-4c6d3e1d1c33.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    },
    "dashboard": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.frontend/dashboard/css/asset-1-4c6d3e1d1c33.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    },
    "frontend": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.frontend/frontend/css/asset-1-4c6d3e1d1c33.css",
        "/.generated/theme-assets/theme.first.frontend/frontend/css/asset-2-3ed2a63c2933.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    }
  },
  "theme.nexus": {
    "admin": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.nexus/admin/css/asset-1-4fc78a9650ff.css",
        "/.generated/theme-assets/theme.nexus/admin/css/asset-2-8faa1263f685.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": true,
      "ignoreCoreScript": false
    },
    "dashboard": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.nexus/dashboard/css/asset-1-4fc78a9650ff.css",
        "/.generated/theme-assets/theme.nexus/dashboard/css/asset-2-8faa1263f685.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": true,
      "ignoreCoreScript": false
    },
    "frontend": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.nexus/frontend/css/asset-1-4fc78a9650ff.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    }
  }
};
