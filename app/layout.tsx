import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { LanguageProvider } from '@/components/i18n/language-provider';
import { NotifyProvider } from '@/components/ui/notify';
import { getRequestLocale } from '@/lib/i18n/server';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { Suspense } from 'react';
import { THEME_MEDIA_QUERY, THEME_STORAGE_KEY } from '@/lib/theme';
import { ThemeRuntimeScript } from '@/components/theme/theme-runtime-script';
import { ThemeI18nHost } from '@/components/theme/theme-i18n-host';
import { bootstrapModuleSdkServer } from '@/lib/modules/sdk-server-bootstrap';

export const metadata: Metadata = {
  title: 'Next.js S-Kit Saas Starter',
  description: 'Get started quickly with Next.js, Postgres, Stripe, and PayPal.'
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

  return (
    <LanguageProvider locale={locale}>
      <ThemeI18nHost locale={locale} defaultLocale={DEFAULT_LOCALE}>
        <NotifyProvider>
          <SWRConfig
            value={{
              fallback: {
                // We do NOT await here
                // Only components that read this data will suspend
                '/api/user': getUser(),
                '/api/team': getTeamForUser()
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
