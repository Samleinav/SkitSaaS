import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { LanguageProvider } from '@/components/i18n/language-provider';
import { NotifyProvider } from '@/components/ui/notify';
import { SdkNotifyBridge } from '@/components/ui/sdk-notify-bridge';
import { getRequestLocale } from '@/lib/i18n/server';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { Suspense } from 'react';
import { THEME_MEDIA_QUERY, THEME_STORAGE_KEY } from '@/lib/theme';
import { ThemeRuntimeScript } from '@/components/theme/theme-runtime-script';
import { ThemeI18nHost } from '@/components/theme/theme-i18n-host';
import { ThemeAreaCssGuard } from '@/components/theme/theme-area-css-guard';
import { bootstrapModuleSdkServer } from '@/lib/modules/sdk-server-bootstrap';
import { getResolvedAppConfig } from '@/lib/runtime-config/load-app-config';
import { areTeamsEnabled } from '@/lib/organizations/config';

const resolvedAppConfig = getResolvedAppConfig();

export const metadata: Metadata = {
  title: resolvedAppConfig.projectName,
  description: `${resolvedAppConfig.projectName} platform.`
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });
const themeInitScript = `(() => {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('${THEME_STORAGE_KEY}');
  const isStoredThemeValid = storedTheme === 'light' || storedTheme === 'dark';
  const systemPrefersDark = window.matchMedia('${THEME_MEDIA_QUERY}').matches;
  const theme = isStoredThemeValid ? storedTheme : systemPrefersDark ? 'dark' : 'light';

  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
})();`;

const themeCssPendingInitScript = `(() => {
  const root = document.documentElement;
  const path = window.location.pathname.toLowerCase();
  const isPrivateArea =
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path === '/dashboard' ||
    path.startsWith('/dashboard/') ||
    path === '/login' ||
    path.startsWith('/login/') ||
    path === '/sign-up' ||
    path.startsWith('/sign-up/') ||
    path === '/sign-in' ||
    path.startsWith('/sign-in/') ||
    path === '/forgot-password' ||
    path.startsWith('/forgot-password/') ||
    path === '/reset-password' ||
    path.startsWith('/reset-password/');

  if (!isPrivateArea) {
    return;
  }

  root.dataset.themeCssPending = '1';
  window.setTimeout(() => {
    if (root.dataset.themeCssPending === '1') {
      delete root.dataset.themeCssPending;
    }
  }, 6000);
})();`;

const themeCssPendingStyle = `
html[data-theme-css-pending='1'] body {
  min-height: 100dvh;
}

html[data-theme-css-pending='1'] body > * {
  visibility: hidden !important;
}

html[data-theme-css-pending='1'] body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background:
    radial-gradient(72rem 42rem at 95% -5%, rgba(30, 200, 195, 0.14), transparent 62%),
    radial-gradient(46rem 30rem at 2% 0%, rgba(200, 230, 240, 0.045), transparent 66%),
    #0d1017;
}

html[data-theme-css-pending='1'] body::after {
  content: '';
  position: fixed;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  margin-top: -14px;
  margin-left: -14px;
  border-radius: 9999px;
  border: 3px solid rgba(148, 163, 184, 0.45);
  border-top-color: rgba(248, 250, 252, 0.95);
  animation: theme-css-pending-spin 0.8s linear infinite;
  z-index: 2147483647;
}

@keyframes theme-css-pending-spin {
  to {
    transform: rotate(360deg);
  }
}
`;

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      suppressHydrationWarning
      className={manrope.className}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCssPendingStyle }} />
        <script dangerouslySetInnerHTML={{ __html: themeCssPendingInitScript }} />
        <ThemeRuntimeScript />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-[100dvh] bg-slate-100 text-foreground antialiased dark:bg-slate-950">
        <Suspense fallback={<RootLayoutSkeleton />}>
          <RootLayoutContent>{children}</RootLayoutContent>
        </Suspense>
      </body>
    </html>
  );
}

function RootLayoutSkeleton() {
  return <div className="min-h-[100dvh]" />;
}

async function RootLayoutContent({
  children
}: {
  children: React.ReactNode;
}) {
  bootstrapModuleSdkServer();
  const locale = await getRequestLocale();
  const teamsEnabled = areTeamsEnabled();

  return (
    <LanguageProvider locale={locale}>
      <ThemeI18nHost locale={locale} defaultLocale={DEFAULT_LOCALE}>
        <NotifyProvider>
          <SdkNotifyBridge />
          <ThemeAreaCssGuard />
          <SWRConfig
            value={{
              fallback: {
                // We do NOT await here
                // Only components that read this data will suspend
                '/api/user': getUser(),
                ...(teamsEnabled ? { '/api/team': getTeamForUser() } : {})
              }
            }}
          >
            {children}
          </SWRConfig>
        </NotifyProvider>
      </ThemeI18nHost>
    </LanguageProvider>
  );
}
