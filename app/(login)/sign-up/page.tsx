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
import { isDashboardEnabled } from '@/lib/config/runtime-surface';
import { Login } from '../login';

export async function generateMetadata(): Promise<Metadata> {
  if (!isDashboardEnabled()) {
    return {};
  }

  const themeSelection = await getThemeSelectionForArea('dashboard');
  const favicon = await getExternalThemeFaviconDataUrlBySelectionFromConfig({
    themeId: themeSelection.themeKey,
    area: 'dashboard'
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

export default async function SignUpPage() {
  if (!isDashboardEnabled()) {
    notFound();
  }

  const themeSelection = await getThemeSelectionForArea('dashboard');
  const loginPolicy = readLoginAreaPolicy('dashboard');
  const loginProviders = await getLoginProviderOptionsForArea('dashboard');
  const themeTokensCss = themeSelection
    ? getExternalThemeTokensCssBySelection({
        themeId: themeSelection.themeKey,
        area: 'dashboard'
      })
    : null;
  const themeGlobalCss = themeSelection
    ? await readExternalThemeGlobalCssBySelectionFromConfig({
        themeId: themeSelection.themeKey,
        area: 'dashboard'
      })
    : null;

  const fallbackPage = (
    <Suspense>
      <Login
        mode="signup"
        signInPath="/login"
        signUpPath="/sign-up"
        authArea="dashboard"
        allowPasswordLogin={loginPolicy.allowPassword}
        providerOptions={loginProviders}
      />
    </Suspense>
  );
  const themedPage = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="page.login.signup"
      themeId={themeSelection.themeKey}
      data={{
        title: 'Create account'
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
          area="dashboard"
          themeKey={themeSelection?.themeKey ?? null}
          tokensCss={themeTokensCss}
        />
      ) : null}
      {themeGlobalCss ? (
        <ThemeGlobalStyle
          area="dashboard"
          themeKey={themeSelection?.themeKey ?? null}
          globalCss={themeGlobalCss}
        />
      ) : null}
      {themedPage}
    </>
  );
}
