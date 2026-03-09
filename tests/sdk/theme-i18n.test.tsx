import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  I18nProvider,
  useI18n,
  type FlatTranslationsByLocale,
  type ThemeTranslationsRegistry
} from '../../app/sdk/src';

function ThemeTranslationProbe({
  themeId,
  area
}: {
  themeId: string;
  area: string;
}) {
  const t = useI18n({ themeId, area });

  return (
    <div
      data-core-translation={t('Cancel')}
      data-theme-translation={t('Dashboard table')}
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
