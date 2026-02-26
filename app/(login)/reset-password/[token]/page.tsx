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
import { isDashboardEnabled } from '@/lib/config/runtime-surface';
import { ResetPassword } from './reset-password';

export async function generateMetadata(): Promise<Metadata> {
  if (!isDashboardEnabled()) {
    return { title: 'Reset Password' };
  }

  const themeSelection = await getThemeSelectionForArea('dashboard');
  const favicon = await getExternalThemeFaviconDataUrlBySelectionFromConfig({
    themeId: themeSelection.themeKey,
    area: 'dashboard'
  });

  if (!favicon) {
    return { title: 'Reset Password' };
  }

  return {
    title: 'Reset Password',
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon
    }
  };
}

export default async function ResetPasswordPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isDashboardEnabled()) {
    notFound();
  }

  const { token } = await params;

  if (!token) {
    notFound();
  }

  const themeSelection = await getThemeSelectionForArea('dashboard');
  const areaAssets = resolveAreaAssetHrefsBySelection({
    themeId: themeSelection.themeKey,
    area: 'dashboard'
  });

  const fallbackPage = (
    <Suspense>
      <ResetPassword
        token={decodeURIComponent(token)}
        themeId={themeSelection?.themeKey ?? null}
      />
    </Suspense>
  );

  const themedPage = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="page.login.reset-password"
      themeId={themeSelection.themeKey}
      data={{ title: 'Reset Password' }}
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
