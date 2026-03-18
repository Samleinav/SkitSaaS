import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  I18nProvider,
  useI18n,
  type FlatTranslationsByLocale,
  type FlatTranslationsByModuleId,
  type ThemeTranslationsRegistry
} from '../../app/sdk/src';

function ThemeTranslationProbe({
  themeId,
  area,
  moduleId
}: {
  themeId: string;
  area: string;
  moduleId?: `mod.${string}`;
}) {
  const t = useI18n({ themeId, area, moduleId });

  return (
    <div
      data-core-translation={t('Cancel')}
      data-theme-translation={t('Dashboard table')}
      data-module-translation={t('Alpha title')}
    />
  );
}

test('SDK useI18n lets theme overrides win over the core flat registry', () => {
  const coreTranslationsByLocale: FlatTranslationsByLocale = {
    en: {
      Cancel: 'Dismiss'
    },
    es: {
      Cancel: 'Cancelar'
    }
  };
  const themeTranslationsByThemeId: ThemeTranslationsRegistry = {
    'theme.test.dashboard': {
      global: {
        en: {
          Cancel: 'Abort'
        },
        es: {
          Cancel: 'Anular'
        }
      },
      dashboard: {
        en: {
          'Dashboard table': 'Operations table'
        },
        es: {
          'Dashboard table': 'Tabla del dashboard'
        }
      }
    }
  };

  const html = renderToStaticMarkup(
    <I18nProvider
      locale="es"
      defaultLocale="en"
      translationsByLocale={coreTranslationsByLocale}
      themeTranslationsByThemeId={themeTranslationsByThemeId}
    >
      <ThemeTranslationProbe themeId="theme.test.dashboard" area="dashboard" />
    </I18nProvider>
  );

  assert.match(html, /data-core-translation="Anular"/);
  assert.match(html, /data-theme-translation="Tabla del dashboard"/);
});

test('SDK useI18n applies theme global and area overrides in default locale', () => {
  const coreTranslationsByLocale: FlatTranslationsByLocale = {
    en: {
      Cancel: 'Dismiss'
    }
  };
  const themeTranslationsByThemeId: ThemeTranslationsRegistry = {
    'theme.test.dashboard': {
      global: {
        en: {
          Cancel: 'Abort'
        }
      },
      dashboard: {
        en: {
          'Dashboard table': 'Operations table'
        }
      }
    }
  };

  const html = renderToStaticMarkup(
    <I18nProvider
      locale="en"
      defaultLocale="en"
      translationsByLocale={coreTranslationsByLocale}
      themeTranslationsByThemeId={themeTranslationsByThemeId}
    >
      <ThemeTranslationProbe themeId="theme.test.dashboard" area="dashboard" />
    </I18nProvider>
  );

  assert.match(html, /data-core-translation="Abort"/);
  assert.match(html, /data-theme-translation="Operations table"/);
});

test('SDK useI18n resolves module-scoped translations before base and below theme overrides', () => {
  const coreTranslationsByLocale: FlatTranslationsByLocale = {
    en: {
      Cancel: 'Dismiss',
      'Alpha title': 'Alpha title'
    },
    es: {
      Cancel: 'Cancelar base',
      'Alpha title': 'Titulo base'
    }
  };
  const moduleTranslationsByModuleId: FlatTranslationsByModuleId = {
    'mod.alpha': {
      en: {
        'Alpha title': 'Alpha title from module'
      },
      es: {
        Cancel: 'Cancelar modulo',
        'Alpha title': 'Titulo modulo'
      }
    }
  };
  const themeTranslationsByThemeId: ThemeTranslationsRegistry = {
    'theme.test.dashboard': {
      dashboard: {
        es: {
          Cancel: 'Cancelar theme',
          'Dashboard table': 'Tabla del dashboard'
        }
      }
    }
  };

  const html = renderToStaticMarkup(
    <I18nProvider
      locale="es"
      defaultLocale="en"
      translationsByLocale={coreTranslationsByLocale}
      moduleTranslationsByModuleId={moduleTranslationsByModuleId}
      themeTranslationsByThemeId={themeTranslationsByThemeId}
    >
      <ThemeTranslationProbe
        themeId="theme.test.dashboard"
        area="dashboard"
        moduleId="mod.alpha"
      />
    </I18nProvider>
  );

  assert.match(html, /data-core-translation="Cancelar theme"/);
  assert.match(html, /data-theme-translation="Tabla del dashboard"/);
  assert.match(html, /data-module-translation="Titulo modulo"/);
});
