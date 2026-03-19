import Link from 'next/link';
import { Suspense } from 'react';
import { Gem, Sparkles } from 'lucide-react';
import { Playfair_Display, Space_Grotesk } from 'next/font/google';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { UserMenu } from '@/components/layout/user-menu';
import { ThemeAreaAssets } from '@/components/theme/theme-area-assets';
import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  getExternalThemeFaviconDataUrlBySelectionFromConfig,
  resolveAreaAssetHrefsBySelection
} from '@/lib/themes/assets';
import { isFrontendEnabled } from '@/lib/config/runtime-surface';
import { cn } from '@/lib/utils';

const marketingSans = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-marketing-sans'
});
const marketingSerif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-marketing-serif'
});

export async function generateMetadata(): Promise<Metadata> {
  if (!isFrontendEnabled()) {
    return {};
  }

  const themeSelection = await getThemeSelectionForArea('frontend');
  const favicon = await getExternalThemeFaviconDataUrlBySelectionFromConfig({
    themeId: themeSelection.themeKey,
    area: 'frontend'
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

async function PublicHeader() {
  const t = await getServerTranslator({ area: 'global' });

  return (
    <header className="relative z-20 border-b border-amber-200/10 bg-[#050505]/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative flex size-11 items-center justify-center rounded-full border border-amber-200/30 bg-amber-200/10 text-amber-100 transition-colors group-hover:border-amber-100/60">
            <Gem className="h-4 w-4" />
            <span className="absolute -inset-1 rounded-full border border-amber-200/20 opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase">
              S-kit SaaS
            </p>
            <span className="font-[family-name:var(--font-marketing-serif)] text-lg font-semibold tracking-wide text-zinc-100">
              Starter
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase transition-colors hover:text-amber-100"
          >
            {t('Home')}
          </Link>
          <Link
            href="/#features"
            className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase transition-colors hover:text-amber-100"
          >
            {t('Features')}
          </Link>
          <Link
            href="/pricing"
            className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase transition-colors hover:text-amber-100"
          >
            {t('Pricing')}
          </Link>
          <Link
            href="/docs"
            className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase transition-colors hover:text-amber-100"
          >
            Docs
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher
            area="global"
            triggerClassName="rounded-sm border-amber-200/20 bg-zinc-900/80 text-zinc-200 backdrop-blur-sm hover:bg-zinc-900 hover:text-amber-100"
          />
          <Suspense fallback={<div className="h-9 w-9" />}>
            <UserMenu tone="public" />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

function PublicBackground() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0 marketing-grid opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 z-0 h-80 w-80 rounded-full bg-amber-300/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 z-0 h-96 w-96 rounded-full bg-yellow-100/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-[140px]" />
    </>
  );
}

async function PublicFooter() {
  const t = await getServerTranslator({ area: 'global' });

  return (
    <footer className="relative z-10 border-t border-amber-200/10 px-4 py-6 text-center text-[10px] tracking-[0.2em] text-zinc-500 uppercase sm:px-6 lg:px-8">
      <span className="inline-flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-amber-200/70" />
        {t('Ready to launch your SaaS?')}
      </span>
    </footer>
  );
}

export default async function FrontendLayout({
  children
}: {
  children: React.ReactNode;
}) {
  if (!isFrontendEnabled()) {
    notFound();
  }

  const themeSelection = await getThemeSelectionForArea('frontend');
  const areaAssets = resolveAreaAssetHrefsBySelection({
    themeId: themeSelection.themeKey,
    area: 'frontend'
  });
  const layoutBody = (
    <>
      <PublicBackground />
      <PublicHeader />
      <div className="relative z-10 flex-1">{children}</div>
      <PublicFooter />
    </>
  );

  const fallbackLayout = (
    <section
      className={cn(
        'relative flex min-h-screen flex-col overflow-x-hidden bg-[#050505] text-zinc-100',
        marketingSans.variable,
        marketingSerif.variable
      )}
    >
      {layoutBody}
    </section>
  );

  if (!themeSelection?.themeKey) {
    return fallbackLayout;
  }

  return (
    <>
      <ThemeAreaAssets
        area="frontend"
        themeId={themeSelection.themeKey}
        cssHrefs={areaAssets.cssHrefs}
        scriptHrefs={areaAssets.scriptHrefs}
      />
      <ThemeFrontendRoute
        path="/__layout"
        themeId={themeSelection.themeKey}
        data={{}}
        className={cn(
          'theme-first-frontend-root min-h-screen text-foreground',
          marketingSans.variable,
          marketingSerif.variable
        )}
        fallback={fallbackLayout}
      >
        {layoutBody}
      </ThemeFrontendRoute>
    </>
  );
}
