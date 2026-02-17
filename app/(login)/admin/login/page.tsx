import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { ThemeGlobalStyle } from '@/components/theme/theme-global-style';
import { ThemeTokensStyle } from '@/components/theme/theme-tokens-style';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  getExternalThemeFaviconDataUrlBySelectionFromConfig,
  readExternalThemeGlobalCssBySelectionFromConfig
} from '@/lib/themes/assets';
import { getExternalThemeTokensCssBySelection } from '@/lib/themes/runtime';
import {
  getLoginProviderOptionsForArea,
  readLoginAreaPolicy
} from '@/lib/auth/login-policy';
import { isAdminEnabled } from '@/lib/config/runtime-surface';
import { Login } from '../../login';

export async function generateMetadata(): Promise<Metadata> {
  if (!isAdminEnabled()) {
    return {};
  }

  const themeSelection = await getThemeSelectionForArea('admin');
  const favicon = await getExternalThemeFaviconDataUrlBySelectionFromConfig({
    themeId: themeSelection.themeKey,
    area: 'admin'
  });

  if (!favicon) {
    return {};
  }

  return {
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon
    }
  };
}

export default async function AdminLoginPage() {
  if (!isAdminEnabled()) {
    notFound();
  }

  const themeSelection = await getThemeSelectionForArea('admin');
  const loginPolicy = readLoginAreaPolicy('admin');
  const loginProviders = await getLoginProviderOptionsForArea('admin');
  const themeTokensCss = themeSelection
    ? getExternalThemeTokensCssBySelection({
        themeId: themeSelection.themeKey,
        area: 'admin'
      })
    : null;
  const themeGlobalCss = themeSelection
    ? await readExternalThemeGlobalCssBySelectionFromConfig({
        themeId: themeSelection.themeKey,
        area: 'admin'
      })
    : null;

  const fallbackPage = (
    <Suspense>
      <Login
        mode="signin"
        allowModeSwitch={false}
        signInPath="/admin/login"
        themeId={themeSelection?.themeKey ?? null}
        authArea="admin"
        allowPasswordLogin={loginPolicy.allowPassword}
        providerOptions={loginProviders}
      />
    </Suspense>
  );
  const themedPage = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="page.login.admin"
      themeId={themeSelection.themeKey}
      data={{
        title: 'Admin sign in'
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  ) : (
    fallbackPage
  );

  return (
    <>
      {themeTokensCss ? (
        <ThemeTokensStyle
          area="admin"
          themeKey={themeSelection?.themeKey ?? null}
          tokensCss={themeTokensCss}
        />
      ) : null}
      {themeGlobalCss ? (
        <ThemeGlobalStyle
          area="admin"
          themeKey={themeSelection?.themeKey ?? null}
          globalCss={themeGlobalCss}
        />
      ) : null}
      {themedPage}
    </>
  );
}
