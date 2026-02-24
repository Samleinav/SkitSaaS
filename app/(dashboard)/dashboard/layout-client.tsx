'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Menu,
  Package,
  Settings,
  Shield,
  Users,
  type LucideIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { PrivateBreadcrumb } from '@/components/ui/private-breadcrumb';
import { ThemeTemplate } from '@/components/ui/theme-template';
import { useAreaMessages } from '@/lib/i18n/client';
import {
  DASHBOARD_LAYOUT_STYLE,
  PRIVATE_LAYOUT_MODE
} from '@/lib/layout/private-area';
import { cn } from '@/lib/utils';

type DashboardSubNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type DashboardNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  children?: DashboardSubNavItem[];
};

function isActivePath(pathname: string, href: string, exact: boolean = false) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function DashboardThemeToggle({
  slot,
  className,
  showLabel = true
}: {
  slot: string;
  className?: string;
  showLabel?: boolean;
}) {
  const fallback = <ThemeToggle className={className} showLabel={showLabel} />;

  return (
    <ThemeTemplate
      id="ui.theme-toggle"
      data={{
        area: 'dashboard',
        slot: slot,
        showLabel: showLabel
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeTemplate>
  );
}

function DashboardLanguageSwitcher({
  slot,
  triggerClassName
}: {
  slot: string;
  triggerClassName?: string;
}) {
  const fallback = (
    <LanguageSwitcher
      area="dashboard"
      triggerClassName={triggerClassName}
    />
  );

  return (
    <ThemeTemplate
      id="ui.language-switcher"
      data={{
        area: 'dashboard',
        slot: slot
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeTemplate>
  );
}

export default function DashboardLayout({
  children,
  moduleItems = []
}: {
  children: React.ReactNode;
  moduleItems?: Array<{ href: string; label: string; exact?: boolean }>;
}) {
  const messages = useAreaMessages('dashboard');
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAdjusted = PRIVATE_LAYOUT_MODE === 'adjusted';

  const settingsSubItems: DashboardSubNavItem[] = [
    {
      href: '/dashboard/general',
      icon: Settings,
      label: messages.layout.nav.general
    },
    {
      href: '/dashboard/activity',
      icon: Activity,
      label: messages.layout.nav.activity
    },
    {
      href: '/dashboard/security',
      icon: Shield,
      label: messages.layout.nav.security
    },
    {
      href: '/dashboard/subscriptions',
      icon: CreditCard,
      label: messages.layout.nav.subscriptions
    }
  ];
  const navItems: DashboardNavItem[] = [
    {
      href: '/dashboard',
      icon: Users,
      label: messages.layout.nav.team,
      exact: true
    },
    {
      href: '/dashboard/general',
      icon: Settings,
      label: messages.layout.settings,
      children: settingsSubItems
    }
  ];
  const moduleNavItems: DashboardNavItem[] = moduleItems.map((item) => ({
    href: item.href,
    icon: Package,
    label: item.label,
    exact: item.exact
  }));
  const combinedNavItems = [...navItems, ...moduleNavItems];

  if (DASHBOARD_LAYOUT_STYLE === 'layout_basic') {
    return (
      <div
        className={cn(
          'mx-auto w-full flex-1',
          isAdjusted
            ? 'max-w-[94rem] px-5 py-7 sm:px-7 lg:px-8 lg:py-9'
            : 'max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3 xl:hidden">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full border-border/70 bg-card/85 shadow-sm"
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="text-sm">{messages.layout.toggleSidebar}</span>
          </Button>

          <div className="flex items-center gap-2">
            <DashboardThemeToggle slot="basic.mobile.header" showLabel={false} />
            <DashboardLanguageSwitcher
              slot="basic.mobile.header"
              triggerClassName="rounded-full border-border/70 bg-card/85"
            />
          </div>
        </div>

        <div
          className={cn(
            'grid',
            isAdjusted ? 'gap-8 xl:grid-cols-[320px_1fr]' : 'gap-6 xl:grid-cols-[300px_1fr]'
          )}
        >
          <aside
            className={cn(
              'space-y-4 xl:sticky xl:top-24 xl:self-start',
              isSidebarOpen ? 'block' : 'hidden xl:block'
            )}
          >
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-slate-100 shadow-xl sm:p-6">
              <div className="pointer-events-none absolute -top-16 -right-8 h-32 w-32 rounded-full bg-orange-300/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-8 h-36 w-36 rounded-full bg-sky-300/15 blur-3xl" />

              <span className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                <Settings className="h-3.5 w-3.5" />
                {messages.layout.settings}
              </span>

              <h2 className="relative text-2xl font-semibold tracking-tight text-white">
                {messages.layout.settings}
              </h2>
              <p className="relative mt-1 text-sm text-white/70">
                {messages.layout.nav.team} - {messages.layout.nav.general} -{' '}
                {messages.layout.nav.activity} - {messages.layout.nav.security} -{' '}
                {messages.layout.nav.subscriptions}
              </p>

              <div className="relative mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <DashboardThemeToggle
                  slot="basic.sidebar.card"
                  className="justify-between border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                />
                <DashboardLanguageSwitcher
                  slot="basic.sidebar.card"
                  triggerClassName="w-full justify-between rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                />
              </div>
            </div>

            <nav className="rounded-2xl border border-border/70 bg-card/85 p-2 shadow-sm backdrop-blur-sm">
              <div className="space-y-1">
                {combinedNavItems.map((item) => {
                  const hasActiveChild =
                    item.children?.some((child) => isActivePath(pathname, child.href)) ??
                    false;
                  const isActive =
                    hasActiveChild || isActivePath(pathname, item.href, item.exact);

                  return (
                    <div key={item.href} className="space-y-1">
                      <Link
                        href={item.href}
                        prefetch={false}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors',
                          isActive
                            ? 'border-primary/25 bg-primary/10 text-foreground shadow-sm'
                            : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-md border',
                            isActive
                              ? 'border-primary/25 bg-background text-primary'
                              : 'border-border/60 bg-background/80 text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 font-medium">{item.label}</span>
                        {item.children ? (
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-muted-foreground/70 transition-transform',
                              isActive ? 'rotate-180' : 'rotate-0'
                            )}
                          />
                        ) : (
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 text-muted-foreground/70 transition-opacity',
                              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            )}
                          />
                        )}
                      </Link>

                      {item.children && isActive ? (
                        <div className="ml-9 space-y-1 border-l border-border/60 pl-2">
                          {item.children.map((child) => {
                            const isChildActive = isActivePath(pathname, child.href);

                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                prefetch={false}
                                aria-current={isChildActive ? 'page' : undefined}
                                onClick={() => setIsSidebarOpen(false)}
                                className={cn(
                                  'group flex items-center gap-2 rounded-lg border px-2 py-2 text-sm transition-colors',
                                  isChildActive
                                    ? 'border-primary/25 bg-primary/10 text-foreground'
                                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground'
                                )}
                              >
                                <child.icon className="h-3.5 w-3.5" />
                                <span className="font-medium">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </nav>
          </aside>

          <main className={cn('min-w-0', isAdjusted ? 'space-y-8' : 'space-y-6')}>
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-slate-100/50 dark:bg-[#0b1222]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.15),transparent_38%)]" />

      {isSidebarOpen ? (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/70 xl:hidden"
          aria-label={messages.layout.toggleSidebar}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[290px] border-r border-slate-800/80 bg-slate-950/95 text-slate-100 shadow-2xl transition-transform duration-200 ease-out xl:z-50 xl:translate-x-0',
          isAdjusted ? 'xl:w-[320px]' : 'xl:w-[288px]',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex h-full flex-col overflow-y-auto',
            isAdjusted ? 'gap-5 p-5' : 'gap-4 p-4'
          )}
        >
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-2xl">
            <div className="pointer-events-none absolute -top-16 -right-10 h-28 w-28 rounded-full bg-blue-500/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 -left-10 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />

            <span className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200">
              <Settings className="h-3.5 w-3.5 text-blue-200" />
              {messages.layout.settings}
            </span>
            <h2 className="relative text-xl font-semibold text-white">
              {messages.layout.settings}
            </h2>
            <p className="relative mt-1 text-sm text-slate-300">
              {messages.layout.nav.team} - {messages.layout.nav.general} -{' '}
              {messages.layout.nav.activity} - {messages.layout.nav.security} -{' '}
              {messages.layout.nav.subscriptions}
            </p>
          </div>

          <nav className="rounded-2xl border border-slate-800/80 bg-slate-950/75 p-2 shadow-xl backdrop-blur-sm">
            <div className="space-y-1.5">
              {combinedNavItems.map((item) => {
                const hasActiveChild =
                  item.children?.some((child) => isActivePath(pathname, child.href)) ??
                  false;
                const isActive =
                  hasActiveChild || isActivePath(pathname, item.href, item.exact);

                return (
                  <div key={item.href} className="space-y-1">
                    <Link
                      href={item.href}
                      prefetch={false}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors',
                        isActive
                          ? 'border-blue-400/30 bg-blue-500/15 text-slate-50 shadow-sm'
                          : 'border-transparent text-slate-300/90 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-md border',
                          isActive
                            ? 'border-blue-300/35 bg-blue-500/20 text-blue-100'
                            : 'border-slate-700 bg-slate-900/80 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-100'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.children ? (
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-slate-500 transition-transform',
                            isActive ? 'rotate-180' : 'rotate-0'
                          )}
                        />
                      ) : (
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 text-slate-500 transition-opacity',
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          )}
                        />
                      )}
                    </Link>

                    {item.children && isActive ? (
                      <div className="ml-10 space-y-1 border-l border-slate-700 pl-2">
                        {item.children.map((child) => {
                          const isChildActive = isActivePath(pathname, child.href);

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              prefetch={false}
                              aria-current={isChildActive ? 'page' : undefined}
                              onClick={() => setIsSidebarOpen(false)}
                              className={cn(
                                'group flex items-center gap-2 rounded-lg border px-2 py-2 text-sm transition-colors',
                                isChildActive
                                  ? 'border-blue-400/30 bg-blue-500/15 text-slate-50'
                                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/70 hover:text-slate-100'
                              )}
                            >
                              <child.icon className="h-3.5 w-3.5" />
                              <span className="font-medium">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="mt-auto grid gap-2">
            <DashboardThemeToggle
              slot="pro.sidebar.footer"
              className="w-full justify-between border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800 hover:text-white"
            />
            <DashboardLanguageSwitcher
              slot="pro.sidebar.footer"
              triggerClassName="w-full justify-between rounded-full border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800 hover:text-white"
            />
          </div>
        </div>
      </aside>

      <main
        className={cn(
          'relative min-w-0 flex-1',
          isAdjusted
            ? 'px-3 py-4 sm:px-6 lg:px-10 lg:py-8 xl:pl-[344px]'
            : 'px-3 py-4 sm:px-5 lg:px-8 lg:py-6 xl:pl-[310px]'
        )}
      >
        <div className={cn('mx-auto w-full', isAdjusted ? 'max-w-[1480px]' : 'max-w-[1240px]')}>
          <div className="mb-4 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsSidebarOpen((open) => !open)}
            >
              {isSidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>

            <PrivateBreadcrumb
              rootHref="/dashboard"
              rootLabel={messages.layout.settings}
              className="flex-1"
              labels={{
                general: messages.layout.nav.general,
                activity: messages.layout.nav.activity,
                security: messages.layout.nav.security,
                subscriptions: messages.layout.nav.subscriptions
              }}
            />

            <div className="ml-auto flex items-center gap-2 xl:hidden">
              <DashboardThemeToggle slot="pro.mobile.header" showLabel={false} />
              <DashboardLanguageSwitcher
                slot="pro.mobile.header"
                triggerClassName="rounded-full border-border/70 bg-card/85"
              />
            </div>
          </div>

          <div className={cn('min-w-0', isAdjusted ? 'space-y-8' : 'space-y-6')}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
