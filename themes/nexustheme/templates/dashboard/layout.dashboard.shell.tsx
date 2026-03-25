'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import {
  mergeClassNames,
  toStringOrNull,
  useI18n
} from '@skitsaas/sdk';
import {
  NexusDashboardNav,
  type DashboardNavItem
} from '../../components/nexus-dashboard-nav';
import { NexusSidebarUser } from '../../components/nexus-sidebar-user';
import type {
  TemplateData as BaseTemplateData,
  TemplateProps
} from '../template-types';

type DashboardShellTemplateData = BaseTemplateData & {
  navItems?: DashboardNavItem[];
  contentSlot?: ReactNode;
};

function formatSegment(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function LayoutDashboardShellTemplate({
  data,
  className,
  children,
  themeId
}: TemplateProps<DashboardShellTemplateData> & { themeId?: string }) {
  const pathname = usePathname();
  const content = data?.contentSlot ?? children;
  const t = useI18n({ themeId, area: 'dashboard' });
  const projectName = data?.projectName?.trim() || 'S-Kit-SaaS';
  const rootLabel = data?.heading?.trim() || t('Dashboard');
  const navItems = Array.isArray(data?.navItems) ? data.navItems : [];
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .filter((segment, index) => !(index === 0 && segment === 'dashboard'));

  return (
    <section
      className={mergeClassNames('min-h-screen bg-background text-foreground', className)}
      data-layout-style={toStringOrNull(data?.layoutStyle) ?? undefined}
      data-layout-mode={toStringOrNull(data?.mode) ?? undefined}
      data-layout-heading={toStringOrNull(data?.heading) ?? undefined}
      data-nexus-dashboard-shell="true"
    >
      <button
        type="button"
        aria-label={t('Close sidebar')}
        data-nexus-sidebar-backdrop
        tabIndex={-1}
        onClick={() => document.documentElement.removeAttribute('data-sidebar-mobile-open')}
        className="fixed inset-0 z-[59] hidden bg-black/50 xl:hidden"
      />

      <aside
        className="fixed inset-y-0 left-0 z-[60] flex w-72 flex-col border-r border-border/70 bg-sidebar xl:w-64"
        data-nexus-dashboard-sidebar
      >
        <div className="flex h-14 shrink-0 items-center border-b border-border/70 px-2.5">
          <Link
            href="/dashboard"
            prefetch={false}
            className="group inline-flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-sidebar-accent/60"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {projectName}
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">
                {t('Client Dashboard')}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pt-3 pb-2">
          <div className="min-h-0 flex-1">
            <NexusDashboardNav items={navItems} themeId={themeId} />
          </div>
        </div>

        <div className="shrink-0 border-t border-border/70 px-2.5 py-2">
          <NexusSidebarUser area="dashboard" themeId={themeId} />
        </div>
      </aside>

      <main className="min-h-screen px-3 pb-6 pt-5 sm:px-4 lg:px-6">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mb-3 px-0.5" data-nexus-dashboard-breadcrumb="minimal">
            <span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {rootLabel}
            </span>
            {segments.map((segment, index) => (
              <span
                key={`${segment}-${index}`}
                className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase"
              >
                {' / '}
                <span className={index === segments.length - 1 ? 'text-foreground/80' : ''}>
                  {formatSegment(segment)}
                </span>
              </span>
            ))}
          </div>

          <section className="mt-3 space-y-5">{content}</section>
        </div>
      </main>
    </section>
  );
}
