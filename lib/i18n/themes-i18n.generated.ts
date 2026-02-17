import type { ThemeI18nRegistry } from '@skitsaas/sdk';

export const THEME_I18N_REGISTRY: ThemeI18nRegistry = {
  "theme.first.backoffice": {
    "fr": {
      "dashboard": {
        "table": {
          "surfaceLabel": "Tableau du dashboard"
        }
      },
      "admin": {
        "table": {
          "surfaceLabel": "Tableau d'administration"
        }
      }
    }
  },
  "theme.pilot.admin": {
    "en": {
      "admin": {
        "pilotTable": {
          "title": "Pilot Admin Table",
          "noData": "No data available in this pilot table",
          "rowsCount": "{count} rows"
        }
      }
    },
    "es": {
      "admin": {
        "pilotTable": {
          "title": "Tabla Piloto Admin",
          "noData": "No hay datos disponibles en esta tabla piloto",
          "rowsCount": "{count} filas"
        }
      }
    }
  }
};
