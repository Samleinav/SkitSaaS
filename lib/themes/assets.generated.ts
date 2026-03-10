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
    "cssHref": "/.generated/core-assets/admin/core-e7f6c5298597.css",
    "scriptHref": null
  },
  "dashboard": {
    "cssHref": "/.generated/core-assets/dashboard/core-e7f6c5298597.css",
    "scriptHref": null
  },
  "frontend": {
    "cssHref": "/.generated/core-assets/frontend/core-e7f6c5298597.css",
    "scriptHref": null
  }
};

export const THEME_ASSETS_BY_THEME_ID: Record<string, Record<ThemeSelectionArea, ThemeAreaAssetsBundle>> = {
  "theme.first.backoffice": {
    "admin": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.backoffice/admin/css/asset-1-5c8d106f5d69.css",
        "/.generated/theme-assets/theme.first.backoffice/admin/css/asset-2-8ffe044e9c1f.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    },
    "dashboard": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.backoffice/dashboard/css/asset-1-5c8d106f5d69.css",
        "/.generated/theme-assets/theme.first.backoffice/dashboard/css/asset-2-8ffe044e9c1f.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    },
    "frontend": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.backoffice/frontend/css/asset-1-5c8d106f5d69.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    }
  },
  "theme.first.frontend": {
    "admin": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.frontend/admin/css/asset-1-947389fe3b6c.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    },
    "dashboard": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.frontend/dashboard/css/asset-1-947389fe3b6c.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    },
    "frontend": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.first.frontend/frontend/css/asset-1-947389fe3b6c.css",
        "/.generated/theme-assets/theme.first.frontend/frontend/css/asset-2-95d0214067f3.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    }
  },
  "theme.nexus": {
    "admin": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.nexus/admin/css/asset-1-3820a9078464.css",
        "/.generated/theme-assets/theme.nexus/admin/css/asset-2-d4c09cb5028b.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": true,
      "ignoreCoreScript": false
    },
    "dashboard": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.nexus/dashboard/css/asset-1-3820a9078464.css",
        "/.generated/theme-assets/theme.nexus/dashboard/css/asset-2-d4c09cb5028b.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": true,
      "ignoreCoreScript": false
    },
    "frontend": {
      "cssHrefs": [
        "/.generated/theme-assets/theme.nexus/frontend/css/asset-1-3820a9078464.css"
      ],
      "scriptHrefs": [],
      "ignoreCoreCss": false,
      "ignoreCoreScript": false
    }
  }
};
