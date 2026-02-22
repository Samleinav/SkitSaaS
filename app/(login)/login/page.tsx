import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ThemeAreaAssets } from '@/components/theme/theme-area-assets';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  getExternalThemeFaviconDataUrlBySelectionFromConfig,
  resolveAreaAssetHrefsBySelection
} from '@/lib/themes/assets';
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

export default async function LoginPage() {
  if (!isDashboardEnabled()) {
    notFound();
  }

  const themeSelection = await getThemeSelectionForArea('dashboard');
  const loginPolicy = readLoginAreaPolicy('dashboard');
  const loginProviders = await getLoginProviderOptionsForArea('dashboard');
  const areaAssets = resolveAreaAssetHrefsBySelection({
    themeId: themeSelection.themeKey,
    area: 'dashboard'
  });

  const fallbackPage = (
    <Suspense>
      <Login
        mode="signin"
        signInPath="/login"
        signUpPath="/sign-up"
        themeId={themeSelection?.themeKey ?? null}
        authArea="dashboard"
        allowPasswordLogin={loginPolicy.allowPassword}
        providerOptions={loginProviders}
      />
    </Suspense>
  );
  const themedPage = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="page.login.user"
      themeId={themeSelection.themeKey}
      data={{
        title: 'Sign in'
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
      <ThemeAreaAssets
        area="dashboard"
        themeId={themeSelection?.themeKey ?? null}
        cssHrefs={areaAssets.cssHrefs}
        scriptHrefs={areaAssets.scriptHrefs}
      />
      {themedPage}
    </>
  );
}
