'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { UserMenu } from '@/components/layout/user-menu';
import { ThemeTemplate } from '@/components/ui/theme-template';

type PrivateAreaHeaderProps = {
  adminThemeId?: string | null;
  dashboardThemeId?: string | null;
  projectName?: string;
};

function resolvePrivateArea(pathname: string | null): 'admin' | 'dashboard' {
  return pathname?.startsWith('/admin') ? 'admin' : 'dashboard';
}

export function PrivateAreaHeader({
  adminThemeId = null,
  dashboardThemeId = null,
  projectName = 'S-Kit-SaaS'
}: PrivateAreaHeaderProps) {
  const pathname = usePathname();
  const activeArea = resolvePrivateArea(pathname);
  const themeId = activeArea === 'admin' ? adminThemeId : dashboardThemeId;
  const resolvedProjectName = projectName.trim() || 'S-Kit-SaaS';

  const languageSwitcherFallback = (
    <LanguageSwitcher
      area="global"
      triggerClassName="rounded-full border-border/70 bg-background/90 backdrop-blur-sm"
    />
  );
  const userMenuFallback = <UserMenu tone="private" />;

  const controlsSlot = (
    <div className="flex items-center gap-2 sm:gap-3">
      <ThemeTemplate
        id="ui.language-switcher"
        themeId={themeId}
        data={{
          area: 'global',
          slot: 'private.header'
        }}
        fallback={languageSwitcherFallback}
      >
        {languageSwitcherFallback}
      </ThemeTemplate>
      <Suspense fallback={<div className="h-9 w-9" />}>
        <ThemeTemplate
          id="ui.user-menu"
          themeId={themeId}
          data={{
            area: activeArea,
            slot: 'private.header',
            tone: 'private'
          }}
          fallback={userMenuFallback}
        >
          {userMenuFallback}
        </ThemeTemplate>
      </Suspense>
    </div>
  );

  const fallbackHeader = (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" prefetch={false} className="group flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-orange-200/70 bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm transition-transform group-hover:-translate-y-0.5 dark:border-orange-400/40 dark:from-orange-400 dark:to-amber-300">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              {activeArea === 'admin' ? 'ADMIN' : 'DASHBOARD'}
            </p>
            <span className="text-base font-semibold text-foreground">
              {resolvedProjectName}
            </span>
          </div>
        </Link>

        {controlsSlot}
      </div>
    </header>
  );

  return (
    <ThemeTemplate
      id="layout.private.header"
      themeId={themeId}
      data={{
        area: activeArea,
        controlsSlot: controlsSlot,
        projectName: resolvedProjectName
      }}
      fallback={fallbackHeader}
    >
      {fallbackHeader}
    </ThemeTemplate>
  );
}
